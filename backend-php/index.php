<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

// Handle CORS — allowlist: portal, marketing website, and any
// tenant subdomain of crea8ivpatientflow.com (wildcard SaaS domains)
function cors_origin_allowed($origin) {
    if ($origin === '') return false;
    $allowed = array_filter([
        CLIENT_URL,
        getenv('WEBSITE_URL') ?: '',
        'http://localhost:5173',
        'http://localhost:8080',
    ]);
    if (in_array($origin, $allowed, true)) return true;

    $host = strtolower(parse_url($origin, PHP_URL_HOST) ?: '');
    // Platform domains: crea8ivmedia.com + any subdomain (clinic., app., etc.)
    if ($host === 'crea8ivmedia.com' || str_ends_with($host, '.crea8ivmedia.com')) return true;
    // Legacy SaaS domain, kept during transition
    if ($host === 'crea8ivpatientflow.com' || str_ends_with($host, '.crea8ivpatientflow.com')) return true;

    // White-label: any domain a clinic has registered as its customDomain
    try {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT 1 FROM Clinic WHERE customDomain IS NOT NULL AND LOWER(customDomain) = ? LIMIT 1");
        $stmt->execute([strtolower($host)]);
        if ($stmt->fetchColumn()) return true;
    } catch (Exception $e) {
        // DB unavailable: fall through to deny (headers still sent below)
    }
    return false;
}

$request_origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (cors_origin_allowed($request_origin)) {
    header("Access-Control-Allow-Origin: $request_origin");
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: ' . CLIENT_URL);
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Extract path
$request_uri = $_SERVER['REQUEST_URI'] ?? '';
$script_name = $_SERVER['SCRIPT_NAME'] ?? '';

// If path starts with script name (e.g. /api/index.php/api/v1/auth/login), clean it
$path = parse_url($request_uri, PHP_URL_PATH);
$script_dir = dirname($script_name);

if ($script_dir !== '/' && strpos($path, $script_dir) === 0) {
    $path = substr($path, strlen($script_dir));
}
// Strip index.php if present
if (strpos($path, '/index.php') === 0) {
    $path = substr($path, 10);
}
$path = trim($path, '/');

// Method
$method = $_SERVER['REQUEST_METHOD'];

// Parse input body
$input = [];
if ($method === 'POST' || $method === 'PUT') {
    $raw_input = file_get_contents('php://input');
    if (!empty($raw_input)) {
        $input = json_decode($raw_input, true) ?: [];
    }
    // Merge post parameters for multipart/form-data support
    $input = array_merge($input, $_POST);
}

// Authentication check middleware
function check_auth() {
    $headers = getallheaders();
    $auth_header = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (empty($auth_header) || strpos($auth_header, 'Bearer ') !== 0) {
        send_error('No token provided', 401);
    }

    $token = substr($auth_header, 7);
    try {
        $user = jwt_verify_access($token);
        return $user;
    } catch (Exception $e) {
        send_error('Invalid or expired token', 401);
    }
}

// Tenant guard: clinic routes need an active (or trial/grace) clinic.
// Superadmin tokens are platform-level and never touch tenant data directly.
function require_active_tenant($user) {
    if (($user['role'] ?? '') === 'superadmin') {
        send_error('Platform admin tokens cannot access clinic routes', 403);
    }
    $clinicId = $user['clinicId'] ?? '';
    if ($clinicId === '') {
        send_error('Invalid token', 401);
    }
    $db = DB::getConnection();
    $stmt = $db->prepare("SELECT status FROM Clinic WHERE id = ?");
    $stmt->execute([$clinicId]);
    $status = $stmt->fetchColumn();
    if ($status === false) {
        send_error('Clinic not found', 401);
    }
    if (!in_array($status, ['active', 'trial', 'grace'], true)) {
        send_error('Your subscription is not active. Please contact support to renew.', 402, [
            'code' => 'subscription_inactive',
            'clinicStatus' => $status,
        ]);
    }
}

function require_superadmin($user) {
    if (($user['role'] ?? '') !== 'superadmin') {
        send_error('Forbidden', 403);
    }
}

// Routing rules table
// format: [Method, Pattern, ControllerClass, ControllerAction, Guard]
// Guard: false = public | true = tenant (auth + active clinic)
//        'auth' = any authenticated user | 'admin' = superadmin only
$routes = [
    // Health Check
    ['GET', '^api/v1/health$', 'StatusController', 'health', false],

    // Auth Routes
    ['POST', '^api/v1/auth/register$', 'AuthController', 'register', false],
    ['POST', '^api/v1/auth/login$', 'AuthController', 'login', false],
    ['POST', '^api/v1/auth/refresh$', 'AuthController', 'refresh', false],
    ['POST', '^api/v1/auth/logout$', 'AuthController', 'logout', false],
    ['POST', '^api/v1/auth/logout-all$', 'AuthController', 'logoutAll', 'auth'],
    ['POST', '^api/v1/auth/forgot-password$', 'AuthController', 'forgotPassword', false],
    ['POST', '^api/v1/auth/reset-password$', 'AuthController', 'resetPassword', false],
    ['GET', '^api/v1/auth/me$', 'AuthController', 'me', 'auth'],

    // Public SaaS registration (clinic signup leads)
    ['POST', '^api/v1/public/register-clinic$', 'RegistrationController', 'register', false],

    // Platform owner (superadmin) routes
    ['GET', '^api/v1/admin/stats$', 'AdminController', 'stats', 'admin'],
    ['GET', '^api/v1/admin/tenants$', 'AdminController', 'listTenants', 'admin'],
    ['POST', '^api/v1/admin/tenants$', 'AdminController', 'createTenant', 'admin'],
    ['GET', '^api/v1/admin/tenants/([^/]+)$', 'AdminController', 'getTenant', 'admin'],
    ['POST', '^api/v1/admin/tenants/([^/]+)/activate$', 'AdminController', 'activateTenant', 'admin'],
    ['POST', '^api/v1/admin/tenants/([^/]+)/suspend$', 'AdminController', 'suspendTenant', 'admin'],
    ['POST', '^api/v1/admin/tenants/([^/]+)/extend$', 'AdminController', 'extendTenant', 'admin'],
    ['PUT', '^api/v1/admin/tenants/([^/]+)/domain$', 'AdminController', 'setDomain', 'admin'],
    ['PUT', '^api/v1/admin/tenants/([^/]+)/domain/ssl$', 'AdminController', 'setDomainSsl', 'admin'],
    ['PUT', '^api/v1/admin/tenants/([^/]+)$', 'AdminController', 'updateTenant', 'admin'],
    ['DELETE', '^api/v1/admin/tenants/([^/]+)$', 'AdminController', 'deleteTenant', 'admin'],
    ['GET', '^api/v1/admin/leads$', 'AdminController', 'listLeads', 'admin'],
    ['POST', '^api/v1/admin/leads$', 'AdminController', 'createLead', 'admin'],
    ['PUT', '^api/v1/admin/leads/([^/]+)$', 'AdminController', 'updateLead', 'admin'],
    ['POST', '^api/v1/admin/leads/([^/]+)/convert$', 'AdminController', 'convertLead', 'admin'],
    ['GET', '^api/v1/admin/payments$', 'AdminController', 'listPayments', 'admin'],
    ['POST', '^api/v1/admin/payments$', 'AdminController', 'recordPayment', 'admin'],
    ['PUT', '^api/v1/admin/payments/([^/]+)/verify$', 'AdminController', 'verifyPayment', 'admin'],
    ['PUT', '^api/v1/admin/payments/([^/]+)/reject$', 'AdminController', 'rejectPayment', 'admin'],
    ['GET', '^api/v1/admin/tickets$', 'AdminController', 'listTickets', 'admin'],
    ['GET', '^api/v1/admin/tickets/([^/]+)$', 'AdminController', 'getTicket', 'admin'],
    ['POST', '^api/v1/admin/tickets/([^/]+)/reply$', 'AdminController', 'replyTicket', 'admin'],
    ['PUT', '^api/v1/admin/tickets/([^/]+)$', 'AdminController', 'updateTicket', 'admin'],

    // Self-service custom domain (clinic owner)
    ['GET', '^api/v1/settings/domain$', 'DomainController', 'get', true],
    ['PUT', '^api/v1/settings/domain$', 'DomainController', 'set', true],
    ['POST', '^api/v1/settings/domain/verify$', 'DomainController', 'verify', true],
    ['DELETE', '^api/v1/settings/domain$', 'DomainController', 'remove', true],

    // Clinic-side support tickets
    ['GET', '^api/v1/support/tickets$', 'SupportController', 'list', true],
    ['POST', '^api/v1/support/tickets$', 'SupportController', 'create', true],
    ['GET', '^api/v1/support/tickets/([^/]+)$', 'SupportController', 'thread', true],
    ['POST', '^api/v1/support/tickets/([^/]+)/reply$', 'SupportController', 'reply', true],

    // Dynamic Settings and Public Website Routes
    ['GET', '^api/v1/settings/public-site$', 'PublicSiteController', 'getSettings', true],
    ['PUT', '^api/v1/settings/public-site$', 'PublicSiteController', 'updateSettings', true],
    ['GET', '^api/v1/public/branding$', 'PublicSiteController', 'branding', false],
    ['GET', '^api/v1/public/site$', 'PublicSiteController', 'getSite', false],
    ['GET', '^api/v1/public/availability$', 'PublicSiteController', 'availability', false],
    ['POST', '^api/v1/public/book$', 'PublicSiteController', 'book', false],

    // Users Routes
    ['GET', '^api/v1/users$', 'UserController', 'list', true],
    ['POST', '^api/v1/users$', 'UserController', 'create', true],
    ['POST', '^api/v1/users/([^/]+)/reset-password$', 'UserController', 'resetPassword', true],
    ['PUT', '^api/v1/users/([^/]+)$', 'UserController', 'update', true],
    ['DELETE', '^api/v1/users/([^/]+)$', 'UserController', 'remove', true],

    // Clients Routes
    ['GET', '^api/v1/clients$', 'ClientController', 'list', true],
    ['POST', '^api/v1/clients$', 'ClientController', 'create', true],
    ['GET', '^api/v1/clients/([^/]+)/appointments$', 'ClientController', 'getAppointments', true],
    ['GET', '^api/v1/clients/([^/]+)/packages$', 'ClientController', 'getPackages', true],
    ['POST', '^api/v1/clients/([^/]+)/portal-credentials$', 'ClientController', 'generatePortalCredentials', true],
    ['GET', '^api/v1/clients/([^/]+)$', 'ClientController', 'getById', true],
    ['PUT', '^api/v1/clients/([^/]+)$', 'ClientController', 'update', true],
    ['DELETE', '^api/v1/clients/([^/]+)$', 'ClientController', 'remove', true],

    // Appointments Routes
    ['GET', '^api/v1/appointments/today$', 'AppointmentController', 'getToday', true],
    ['GET', '^api/v1/appointments/conflicts$', 'AppointmentController', 'getConflicts', true],
    ['GET', '^api/v1/appointments$', 'AppointmentController', 'list', true],
    ['POST', '^api/v1/appointments$', 'AppointmentController', 'create', true],
    ['GET', '^api/v1/appointments/([^/]+)$', 'AppointmentController', 'getById', true],
    ['PUT', '^api/v1/appointments/([^/]+)$', 'AppointmentController', 'update', true],
    ['DELETE', '^api/v1/appointments/([^/]+)$', 'AppointmentController', 'cancel', true],
    ['PUT', '^api/v1/appointments/([^/]+)/cancel$', 'AppointmentController', 'cancel', true],
    ['PUT', '^api/v1/appointments/([^/]+)/checkin$', 'AppointmentController', 'checkIn', true],

    // Staff Routes
    ['GET', '^api/v1/staff$', 'StaffController', 'list', true],
    ['POST', '^api/v1/staff$', 'StaffController', 'create', true],
    ['GET', '^api/v1/staff/([^/]+)/performance$', 'StaffController', 'getPerformance', true],
    ['GET', '^api/v1/staff/([^/]+)$', 'StaffController', 'getById', true],
    ['PUT', '^api/v1/staff/([^/]+)$', 'StaffController', 'update', true],
    ['DELETE', '^api/v1/staff/([^/]+)$', 'StaffController', 'remove', true],

    // Services Routes
    ['GET', '^api/v1/services$', 'ServiceController', 'list', true],
    ['POST', '^api/v1/services$', 'ServiceController', 'create', true],
    ['GET', '^api/v1/services/([^/]+)$', 'ServiceController', 'getById', true],
    ['PUT', '^api/v1/services/([^/]+)$', 'ServiceController', 'update', true],
    ['DELETE', '^api/v1/services/([^/]+)$', 'ServiceController', 'remove', true],

    // Packages Routes
    ['GET', '^api/v1/packages$', 'PackageController', 'list', true],
    ['POST', '^api/v1/packages$', 'PackageController', 'create', true],
    ['PUT', '^api/v1/packages/([^/]+)$', 'PackageController', 'update', true],
    ['DELETE', '^api/v1/packages/([^/]+)$', 'PackageController', 'remove', true],
    ['POST', '^api/v1/packages/([^/]+)/purchase$', 'PackageController', 'purchase', true],
    ['GET', '^api/v1/packages/client/([^/]+)$', 'PackageController', 'getClientPackages', true],

    // Invoices Routes
    ['GET', '^api/v1/invoices$', 'InvoiceController', 'list', true],
    ['POST', '^api/v1/invoices$', 'InvoiceController', 'create', true],
    ['PUT', '^api/v1/invoices/([^/]+)/paid$', 'InvoiceController', 'markPaid', true],
    ['PUT', '^api/v1/invoices/([^/]+)/refund$', 'InvoiceController', 'refund', true],
    ['GET', '^api/v1/invoices/([^/]+)/pdf$', 'InvoiceController', 'getPDF', true],
    ['GET', '^api/v1/invoices/([^/]+)$', 'InvoiceController', 'getById', true],
    ['PUT', '^api/v1/invoices/([^/]+)$', 'InvoiceController', 'update', true],
    ['DELETE', '^api/v1/invoices/([^/]+)$', 'InvoiceController', 'remove', true],

    // Inventory Routes
    ['GET', '^api/v1/inventory/alerts/low-stock$', 'InventoryController', 'getLowStock', true],
    ['GET', '^api/v1/inventory$', 'InventoryController', 'list', true],
    ['POST', '^api/v1/inventory$', 'InventoryController', 'create', true],
    ['GET', '^api/v1/inventory/([^/]+)$', 'InventoryController', 'getById', true],
    ['PUT', '^api/v1/inventory/([^/]+)$', 'InventoryController', 'update', true],
    ['POST', '^api/v1/inventory/([^/]+)/stock$', 'InventoryController', 'adjustStock', true],

    // Financials Routes
    ['GET', '^api/v1/financials/summary$', 'FinancialController', 'getSummary', true],
    ['GET', '^api/v1/financials/monthly$', 'FinancialController', 'getMonthly', true],
    ['GET', '^api/v1/financials/transactions$', 'FinancialController', 'getTransactions', true],

    // AI Hub Routes
    ['GET', '^api/v1/ai/overview$', 'AIHubController', 'overview', true],
    ['PUT', '^api/v1/ai/providers/([^/]+)$', 'AIHubController', 'saveProvider', true],

    // Meta Lead Center Routes
    ['GET', '^api/v1/meta/settings$', 'MetaLeadController', 'settings', true],
    ['PUT', '^api/v1/meta/settings$', 'MetaLeadController', 'saveSettings', true],
    ['GET', '^api/v1/meta/leads$', 'MetaLeadController', 'list', true],
    ['POST', '^api/v1/meta/leads$', 'MetaLeadController', 'create', true],
    ['PUT', '^api/v1/meta/leads/([^/]+)$', 'MetaLeadController', 'update', true],
    ['DELETE', '^api/v1/meta/leads/([^/]+)$', 'MetaLeadController', 'remove', true],
    ['POST', '^api/v1/meta/leads/([^/]+)/convert$', 'MetaLeadController', 'convert', true],

    // Import/Migration Routes
    ['GET', '^api/v1/import/jobs$', 'ImportController', 'list', true],
    ['POST', '^api/v1/import/jobs$', 'ImportController', 'create', true],
    ['PUT', '^api/v1/import/jobs/([^/]+)$', 'ImportController', 'update', true],
    ['DELETE', '^api/v1/import/jobs/([^/]+)$', 'ImportController', 'remove', true],

    // Feedback Routes
    ['GET', '^api/v1/feedback/summary$', 'FeedbackController', 'getSummary', true],
    ['GET', '^api/v1/feedback$', 'FeedbackController', 'list', true],
    ['POST', '^api/v1/feedback$', 'FeedbackController', 'create', true],
    ['PUT', '^api/v1/feedback/([^/]+)$', 'FeedbackController', 'update', true],
    ['DELETE', '^api/v1/feedback/([^/]+)$', 'FeedbackController', 'remove', true],

    // Campaign/Marketing Routes
    ['GET', '^api/v1/campaigns$', 'MarketingController', 'list', true],
    ['POST', '^api/v1/campaigns$', 'MarketingController', 'create', true],
    ['GET', '^api/v1/campaigns/([^/]+)$', 'MarketingController', 'getById', true],
    ['PUT', '^api/v1/campaigns/([^/]+)$', 'MarketingController', 'update', true],
    ['DELETE', '^api/v1/campaigns/([^/]+)$', 'MarketingController', 'remove', true],
    ['POST', '^api/v1/campaigns/([^/]+)/send$', 'MarketingController', 'send', true],

    // Gallery Routes
    ['GET', '^api/v1/gallery/([^/]+)$', 'GalleryController', 'list', true],
    ['POST', '^api/v1/gallery/([^/]+)$', 'GalleryController', 'upload', true],
    ['DELETE', '^api/v1/gallery/([^/]+)$', 'GalleryController', 'remove', true],

    // Branches Routes
    ['GET', '^api/v1/branches$', 'BranchController', 'list', true],
    ['POST', '^api/v1/branches$', 'BranchController', 'create', true],
    ['PUT', '^api/v1/branches/([^/]+)$', 'BranchController', 'update', true],
    ['DELETE', '^api/v1/branches/([^/]+)$', 'BranchController', 'remove', true],

    // Audit Routes
    ['GET', '^api/v1/audit$', 'AuditController', 'list', true],

    // WhatsApp Patient Engagement Center
    ['GET', '^api/v1/whatsapp/webhook$', 'WhatsAppController', 'webhookVerify', false],
    ['POST', '^api/v1/whatsapp/webhook$', 'WhatsAppController', 'webhook', false],
    ['GET', '^api/v1/whatsapp/dashboard$', 'WhatsAppController', 'dashboard', true],
    ['GET', '^api/v1/whatsapp/health$', 'WhatsAppController', 'health', true],
    ['POST', '^api/v1/whatsapp/test-message$', 'WhatsAppController', 'testMessage', true],
    ['POST', '^api/v1/whatsapp/templates/sync$', 'WhatsAppController', 'syncTemplates', true],
    ['GET', '^api/v1/whatsapp/diagnostics$', 'WhatsAppController', 'diagnostics', true],
    ['POST', '^api/v1/whatsapp/queue/retry$', 'WhatsAppController', 'retryQueue', true],
    ['GET', '^api/v1/whatsapp/media$', 'WhatsAppController', 'media', true],
    ['GET', '^api/v1/whatsapp/branches$', 'WhatsAppController', 'branches', true],
    ['PUT', '^api/v1/whatsapp/branches/([^/]+)$', 'WhatsAppController', 'updateBranch', true],
    ['GET', '^api/v1/whatsapp/contacts$', 'WhatsAppController', 'contacts', true],
    ['GET', '^api/v1/whatsapp/contacts/([^/]+)$', 'WhatsAppController', 'profile', true],
    ['GET', '^api/v1/whatsapp/conversations/([^/]+)$', 'WhatsAppController', 'messages', true],
    ['POST', '^api/v1/whatsapp/conversations/([^/]+)/messages$', 'WhatsAppController', 'send', true],
    ['POST', '^api/v1/whatsapp/conversations/([^/]+)/templates$', 'WhatsAppController', 'sendTemplate', true],
    ['PUT', '^api/v1/whatsapp/conversations/([^/]+)$', 'WhatsAppController', 'updateConversation', true],
    ['PUT', '^api/v1/whatsapp/contacts/([^/]+)/consent$', 'WhatsAppController', 'updateConsent', true],
    ['GET', '^api/v1/whatsapp/templates$', 'WhatsAppController', 'templates', true],
    ['POST', '^api/v1/whatsapp/templates$', 'WhatsAppController', 'createTemplate', true],
    ['GET', '^api/v1/whatsapp/automations$', 'WhatsAppController', 'automations', true],
    ['POST', '^api/v1/whatsapp/automations$', 'WhatsAppController', 'createAutomation', true],
    ['POST', '^api/v1/whatsapp/automations/run$', 'WhatsAppController', 'runAutomations', true],
    ['PUT', '^api/v1/whatsapp/automations/([^/]+)/toggle$', 'WhatsAppController', 'toggleAutomation', true],
    ['GET', '^api/v1/whatsapp/campaigns$', 'WhatsAppController', 'campaigns', true],
    ['POST', '^api/v1/whatsapp/campaigns$', 'WhatsAppController', 'createCampaign', true],
    ['POST', '^api/v1/whatsapp/campaigns/([^/]+)/launch$', 'WhatsAppController', 'launchCampaign', true],
    ['GET', '^api/v1/whatsapp/segments$', 'WhatsAppController', 'segments', true],
    ['GET', '^api/v1/whatsapp/settings$', 'WhatsAppController', 'settingsGet', true],
    ['PUT', '^api/v1/whatsapp/settings$', 'WhatsAppController', 'settingsSave', true],

    // Notifications Routes
    ['GET', '^api/v1/notifications$', 'NotificationController', 'list', true],
    ['POST', '^api/v1/notifications/([^/]+)/read$', 'NotificationController', 'markRead', true],
    ['POST', '^api/v1/notifications/read-all$', 'NotificationController', 'markAllRead', true],

    // Patient Portal Client Routes
    ['POST', '^api/v1/portal/login$', 'PortalController', 'login', false],
    ['GET', '^api/v1/portal/appointments$', 'PortalController', 'getMyAppointments', true],
    ['POST', '^api/v1/portal/appointments$', 'PortalController', 'bookAppointment', true],
    ['GET', '^api/v1/portal/invoices$', 'PortalController', 'getMyInvoices', true],
    ['GET', '^api/v1/portal/invoices/([^/]+)/download$', 'PortalController', 'downloadInvoice', true],
    ['GET', '^api/v1/portal/packages$', 'PortalController', 'getMyPackages', true],
    ['POST', '^api/v1/portal/feedback$', 'PortalController', 'submitFeedback', true],
];

// Perform Route Match
$matched = false;
foreach ($routes as $route) {
    list($route_method, $pattern, $controllerName, $actionName, $guard) = $route;

    $method_matched = ($method === $route_method) || ($route_method === 'PUT' && $method === 'PATCH');
    if ($method_matched && preg_match('#' . $pattern . '#', $path, $matches)) {
        $matched = true;
        array_shift($matches); // Remove the full path match

        $user = null;
        if ($guard !== false) {
            $user = check_auth();
            if ($guard === 'admin') {
                require_superadmin($user);
            } elseif ($guard === true) {
                require_active_tenant($user);
            }
            // 'auth' = any valid token, no further checks
        }
        
        $controllerFile = __DIR__ . '/controllers/' . $controllerName . '.php';
        if (file_exists($controllerFile)) {
            require_once $controllerFile;
            $controller = new $controllerName();
            
            try {
                $controller->$actionName($input, $user, ...$matches);
            } catch (Exception $e) {
                send_error($e->getMessage(), 500);
            }
        } else {
            send_error("Controller file $controllerName not found", 500);
        }
        exit;
    }
}

if (!$matched) {
    send_error("Route not found: $method /$path", 404);
}
