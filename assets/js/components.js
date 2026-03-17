/* =============================================================================
   Prokaiwa - Shared Components (auto-generated)
   Injects the site nav and footer into every page.
   Edit this file to update the nav/footer everywhere at once.
   ============================================================================= */
(function () {
  var navHTML = "<header class=\"site-header\">\n        <div class=\"container\">\n            <img src=\"/assets/images/prokaiwa-logo.jpg\" alt=\"Prokaiwa Logo\" class=\"logo\" />\n            <button class=\"burger-menu\" aria-label=\"Toggle navigation\">\n                <i class=\"fas fa-bars\"></i>\n            </button>\n            <nav class=\"main-nav\">\n                <ul>\n                    <li><a href=\"/\" class=\"active\">Home</a></li>\n                    <li><a href=\"/about\">About</a></li>\n                    <li><a href=\"/contact\">Contact</a></li>\n                    <li><a href=\"/login.html\" id=\"auth-nav-link\" style=\"visibility: hidden;\">Log In</a></li>\n                    <li>\n                        <div class=\"nav-lang-toggle\">\n                            <button data-lang=\"ja\" aria-label=\"\u65e5\u672c\u8a9e\u306b\u5207\u308a\u66ff\u3048\">\u65e5\u672c\u8a9e</button>\n                            <button data-lang=\"en\" aria-label=\"Switch to English\">English</button>\n                        </div>\n                    </li>\n                </ul>\n            </nav>\n        </div>\n    </header>";
  var footerHTML = "<footer class=\"site-footer\">\n        <div class=\"container\">\n            <div class=\"footer-grid\">\n                <div class=\"footer-column\">\n                    <h3>Company</h3>\n                    <ul>\n                        <li><a href=\"/about\">About Us</a></li>\n                        <li><a href=\"/contact\">Contact</a></li>\n                        <li><a href=\"/teacher-login.html\" style=\"opacity: 0.6; font-size: 0.9em;\">Teacher Login</a></li>\n                    </ul>\n                </div>\n                <div class=\"footer-column\">\n                    <h3>Legal</h3>\n                    <ul>\n                        <li><a href=\"/commerce-disclosure\">Commerce Disclosure</a></li>\n                        <li><a href=\"/privacy-policy\">Privacy Policy</a></li>\n                        <li><a href=\"/terms-of-service\">Terms of Service</a></li>\n                    </ul>\n                </div>\n                <div class=\"footer-column\">\n                    <h3>Connect</h3>\n                    <div class=\"footer-social-icons\">\n                        <a href=\"https://page.line.me/845irjbc\" class=\"social-icon\" target=\"_blank\" aria-label=\"LINE\"><i class=\"fab fa-line\"></i></a>\n                        <a href=\"https://www.instagram.com/prokaiwa.english/\" class=\"social-icon\" target=\"_blank\" aria-label=\"Instagram\"><i class=\"fab fa-instagram\"></i></a>\n                        <a href=\"https://x.com/ProkaiwaEnglish\" class=\"social-icon\" target=\"_blank\" aria-label=\"X (formerly Twitter)\"><i class=\"fab fa-x-twitter\"></i></a>\n                    </div>\n                    <a href=\"mailto:prokaiwa.english@gmail.com\" class=\"footer-email\">prokaiwa.english@gmail.com</a>\n                </div>\n            </div>\n            <p>\u00a9 <span id=\"year\"></span> Prokaiwa. All rights reserved.</p>\n        </div>\n    </footer>";

  // Replace placeholder divs with real HTML
  var navEl = document.getElementById('nav-placeholder');
  var footerEl = document.getElementById('footer-placeholder');

  if (navEl)    { navEl.outerHTML = navHTML; }
  if (footerEl) { footerEl.outerHTML = footerHTML; }
})();

// Auth nav: show Log Out on dashboard/account pages, Dashboard if logged in elsewhere, Log In if not
(function() {
  import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm').then(({ createClient }) => {
    const supabase = createClient(
      'https://luyzyzefgintksydmwoh.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1eXp5emVmZ2ludGtzeWRtd29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NzYyMDUsImV4cCI6MjA2ODU1MjIwNX0.he5_j99ZtAj4K_zzgm11NEEv7TrbRJYndJXot25s_Kg',
      { auth: { persistSession: true, storageKey: 'prokaiwa-supabase-auth', storage: window.localStorage, autoRefreshToken: true, detectSessionInUrl: true } }
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      const loginLink = document.querySelector('#auth-nav-link');
      if (loginLink) {
        const isAuthPage = window.location.pathname.includes('dashboard') || 
                           window.location.pathname.includes('account-settings');
        if (session && isAuthPage) {
          loginLink.textContent = 'Log Out';
          loginLink.href = '#';
          loginLink.style.visibility = 'visible';
          loginLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = '/login.html';
          });
        } else if (session) {
          loginLink.href = '/dashboard.html';
          loginLink.textContent = 'Dashboard';
          loginLink.style.visibility = 'visible';
        } else {
          loginLink.href = '/login.html';
          loginLink.textContent = 'Log In';
          loginLink.style.visibility = 'visible';
        }
      }
    });
  });
})();
