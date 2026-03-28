/**
 * Prokaiwa Website - Main JavaScript
 * Minimally Enhanced Version
 * 
 * Based on original working script with these additions:
 * - Better code comments and documentation
 * - ARIA attributes for accessibility
 * - Click outside to close menu
 * - Escape key to close menu
 */

'use strict';

// Wait for the page to fully load before running any code
document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================================================
    // ELEMENT SELECTORS
    // ==========================================================================
    
    const burgerMenu = document.querySelector('.burger-menu');
    const mainNav = document.querySelector('.main-nav');
    const langToggle = document.querySelector('.nav-lang-toggle');
    const yearSpan = document.getElementById('year');

    
    // ==========================================================================
    // LANGUAGE TOGGLE FUNCTIONALITY
    // ==========================================================================
    
    if (langToggle) {
        /**
         * Sets the active language and shows/hides content accordingly
         * @param {string} lang - The language code ('ja' or 'en')
         */
        function setLanguage(lang) {
            // Save user's language preference
            localStorage.setItem('prokaiwaLang', lang);

            const isJapanese = lang === 'ja';
            
            // Update HTML lang attribute for accessibility and SEO
            document.documentElement.lang = lang;

            // Get all elements with language attributes
            const allLangElements = document.body.querySelectorAll('[lang="ja"], [lang="en"]');
            
            allLangElements.forEach(el => {
                // Skip the language toggle buttons themselves
                if (el.closest('.nav-lang-toggle')) return;

                if (el.getAttribute('lang') === lang) {
                    // Show elements in selected language
                    el.style.display = '';
                    el.removeAttribute('aria-hidden'); // ARIA: Make visible to screen readers
                    
                    if (el.classList.contains('lang-section')) {
                        el.classList.add('show');
                    }
                } else {
                    // Hide elements in other language
                    el.style.display = 'none';
                    el.setAttribute('aria-hidden', 'true'); // ARIA: Hide from screen readers
                    
                    if (el.classList.contains('lang-section')) {
                        el.classList.remove('show');
                    }
                }
            });

            // Update button states
            const jaButton = langToggle.querySelector('[data-lang="ja"]');
            const enButton = langToggle.querySelector('[data-lang="en"]');
            
            jaButton.classList.toggle('active', isJapanese);
            enButton.classList.toggle('active', !isJapanese);
            
            // ARIA: Update button pressed states for screen readers
            jaButton.setAttribute('aria-pressed', isJapanese ? 'true' : 'false');
            enButton.setAttribute('aria-pressed', isJapanese ? 'false' : 'true');
        }

        // Language button click handler
        langToggle.addEventListener('click', event => {
            const button = event.target.closest('button[data-lang]');
            if (button) {
                setLanguage(button.dataset.lang);
            }
        });

        // Initialize language on page load
        const savedLang = localStorage.getItem('prokaiwaLang');
        if (savedLang && (savedLang === 'ja' || savedLang === 'en')) {
            // Use saved preference
            setLanguage(savedLang);
        } else {
            // Auto-detect from browser settings
            const userLang = (navigator.language || navigator.userLanguage).split('-')[0];
            setLanguage(userLang === 'ja' ? 'ja' : 'en');
        }
    }
    
    
    // ==========================================================================
    // BURGER MENU FUNCTIONALITY
    // ==========================================================================
    
    if (burgerMenu && mainNav) {
        /**
         * Toggles the mobile menu open/closed
         */
        function toggleMenu() {
            const isOpen = mainNav.classList.toggle('open');
            
            // ARIA: Update expanded state for screen readers
            burgerMenu.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            
            // Toggle the hamburger/close icon
            const burgerIcon = burgerMenu.querySelector('i');
            if (burgerIcon) {
                burgerIcon.classList.toggle('fa-bars');
                burgerIcon.classList.toggle('fa-times');
            }
        }
        
        // Click burger menu to toggle
        burgerMenu.addEventListener('click', toggleMenu);
        
        // NEW FEATURE: Click outside menu to close it
        document.addEventListener('click', (event) => {
            // Only run if menu is currently open
            if (mainNav.classList.contains('open')) {
                // Check if click was outside both the menu and burger button
                if (!mainNav.contains(event.target) && !burgerMenu.contains(event.target)) {
                    // Close the menu
                    mainNav.classList.remove('open');
                    burgerMenu.setAttribute('aria-expanded', 'false');
                    
                    const burgerIcon = burgerMenu.querySelector('i');
                    if (burgerIcon) {
                        burgerIcon.classList.remove('fa-times');
                        burgerIcon.classList.add('fa-bars');
                    }
                }
            }
        });
        
        // NEW FEATURE: Press Escape key to close menu
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && mainNav.classList.contains('open')) {
                // Close the menu
                mainNav.classList.remove('open');
                burgerMenu.setAttribute('aria-expanded', 'false');
                
                const burgerIcon = burgerMenu.querySelector('i');
                if (burgerIcon) {
                    burgerIcon.classList.remove('fa-times');
                    burgerIcon.classList.add('fa-bars');
                }
                
                // Return focus to burger button for keyboard users
                burgerMenu.focus();
            }
        });
    }
    
    
    // ==========================================================================
    // FOOTER YEAR
    // ==========================================================================
    
    if (yearSpan) {
        // Automatically display current year in footer
        yearSpan.textContent = new Date().getFullYear();
    }

    
    // ==========================================================================
    // FAQ ACCORDION FUNCTIONALITY
    // ==========================================================================
    
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    if (faqQuestions.length > 0) {
        // Get all FAQ answers once for performance
        const allAnswers = document.querySelectorAll('.faq-answer');
        
        faqQuestions.forEach((question, index) => {
            const answer = question.nextElementSibling;
            
            // Set up ARIA attributes for accessibility
            const answerId = `faq-answer-${index}`;
            answer.id = answerId;
            
            // ARIA: Make FAQ keyboard accessible
            question.setAttribute('role', 'button');
            question.setAttribute('tabindex', '0');
            question.setAttribute('aria-expanded', 'false');
            question.setAttribute('aria-controls', answerId);
            
            /**
             * Toggles FAQ answer open/closed
             */
            function toggleFAQ() {
                const wasOpen = answer.classList.contains('open');
                
                // Close all FAQ answers
                allAnswers.forEach(ans => {
                    ans.style.maxHeight = null;
                    ans.classList.remove('open');
                });
                
                // Update all questions' ARIA states
                faqQuestions.forEach(q => {
                    q.setAttribute('aria-expanded', 'false');
                });
                
                // If this FAQ wasn't already open, open it
                if (!wasOpen) {
                    answer.classList.add('open');
                    answer.style.maxHeight = (answer.scrollHeight + 40) + 'px';
                    
                    // ARIA: Update expanded state
                    question.setAttribute('aria-expanded', 'true');
                }
            }
            
            // Handle mouse clicks
            question.addEventListener('click', toggleFAQ);
            
            // Handle keyboard navigation (Enter and Space keys)
            question.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault(); // Prevent page scroll on Space
                    toggleFAQ();
                }
            });
        });
    }
    
    
// ==========================================================================
// FAQ SCROLL FROM EXTERNAL PAGES
// ==========================================================================

/**
 * Handles scrolling to FAQ section when user clicks "View FAQ" 
 * from account settings or other pages
 */
if (sessionStorage.getItem('scrollToFAQ') === 'true') {
    sessionStorage.removeItem('scrollToFAQ');
    
    // Wait for language section to be visible before scrolling
    const waitForFAQ = setInterval(() => {
        // Get current language from localStorage
        const currentLang = localStorage.getItem('prokaiwaLang') || 
                          (navigator.language || navigator.userLanguage).split('-')[0];
        const lang = currentLang === 'ja' ? 'ja' : 'en';
        
        // Try to find the FAQ section for current language
        const faqSection = document.getElementById(`${lang}-faq`);
        
        // Check if section exists AND is actually visible (has height)
        if (faqSection && faqSection.offsetHeight > 0) {
            clearInterval(waitForFAQ); // Stop checking
            
            // Scroll to FAQ
            faqSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            
            // Add subtle highlight effect
            faqSection.style.transition = 'background-color 0.3s ease';
            const originalBg = window.getComputedStyle(faqSection).backgroundColor;
            faqSection.style.backgroundColor = 'rgba(0, 128, 128, 0.1)';
            
            setTimeout(() => {
                faqSection.style.backgroundColor = originalBg;
            }, 2000);
        }
    }, 100); // Check every 100ms
}

    
    // ==========================================================================
    // HERO TAGLINE TYPING EFFECT
    // ==========================================================================
    
    const typedElements = document.querySelectorAll('.tagline-typed');
    
    if (typedElements.length > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        typedElements.forEach(el => {
            const fullText = el.getAttribute('data-text') || '';
            const cursor = el.nextElementSibling;
            let charIndex = 0;
            
            // Wait for the entrance animation to finish before typing starts
            const entranceDelay = parseInt(getComputedStyle(el).getPropertyValue('--entrance-delay')) || 0;
            
            setTimeout(() => {
                function typeNextChar() {
                    if (charIndex < fullText.length) {
                        el.textContent += fullText[charIndex];
                        charIndex++;
                        // Vary speed slightly for natural feel
                        const delay = 60 + Math.random() * 60;
                        setTimeout(typeNextChar, delay);
                    } else {
                        // Typing done — blink cursor a few times then fade
                        if (cursor) {
                            cursor.classList.add('done');
                        }
                    }
                }
                typeNextChar();
            }, entranceDelay + 800);
        });
    } else {
        // Reduced motion — show text immediately
        typedElements.forEach(el => {
            el.textContent = el.getAttribute('data-text') || '';
            const cursor = el.nextElementSibling;
            if (cursor) cursor.style.display = 'none';
        });
    }



    // ==========================================================================
    // TESTIMONIALS CAROUSEL — Clone cards for loop + touch pause
    // ==========================================================================
    
    const carousels = document.querySelectorAll('.testimonials-carousel');
    
    carousels.forEach(function(carousel) {
        var cards = carousel.querySelectorAll('.testimonial-card');
        if (cards.length === 0) return;
        
        // Wrap existing cards in a track div
        var track = document.createElement('div');
        track.className = 'testimonials-track';
        
        // Move cards into track
        cards.forEach(function(card) {
            track.appendChild(card);
        });
        
        // Clone all cards for seamless loop
        cards.forEach(function(card) {
            track.appendChild(card.cloneNode(true));
        });
        
        carousel.appendChild(track);
        
        // Pause on touch for mobile
        carousel.addEventListener('touchstart', function() {
            track.style.animationPlayState = 'paused';
        }, { passive: true });
        
        carousel.addEventListener('touchend', function() {
            track.style.animationPlayState = 'running';
        }, { passive: true });
    });


    // ==========================================================================
    // LOTTIE CYCLE ANIMATION (Work > Travel > Conversation)
    // ==========================================================================
    
    document.querySelectorAll('[data-lottie-cycle]').forEach(function(container) {
        var players = Array.from(container.querySelectorAll('dotlottie-player'));
        if (players.length === 0) return;
        
        var currentIndex = 0;
        var readyCount = 0;
        
        function cycleToNext() {
            players[currentIndex].classList.remove('lottie-active');
            var prev = currentIndex;
            currentIndex = (currentIndex + 1) % players.length;
            
            // Reset the outgoing player so it can replay next cycle
            setTimeout(function() {
                try { players[prev].stop(); } catch(e) {}
            }, 100);
            
            // Fade in and play next
            setTimeout(function() {
                players[currentIndex].classList.add('lottie-active');
                try { players[currentIndex].play(); } catch(e) {}
            }, 100);
        }
        
        players.forEach(function(player) {
            player.addEventListener('complete', function() {
                setTimeout(cycleToNext, 50);
            });
            
            player.addEventListener('ready', function() {
                readyCount++;
                if (readyCount === players.length) {
                    players[0].classList.add('lottie-active');
                    try { players[0].play(); } catch(e) {}
                }
            });
        });
        
        setTimeout(function() {
            if (!players[0].classList.contains('lottie-active')) {
                players[0].classList.add('lottie-active');
                try { players[0].play(); } catch(e) {}
            }
        }, 3000);
    });

        // ==========================================================================
    // SCROLL REVEAL ANIMATIONS (IntersectionObserver)
    // ==========================================================================
    
    const revealElements = document.querySelectorAll('.reveal');
    
    if (revealElements.length > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        });
        
        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        // If reduced motion or no observer support, show everything immediately
        revealElements.forEach(el => el.classList.add('revealed'));
    }

    
  // ==========================================================================

    // ==========================================================================
    // HOW IT WORKS — LINE PHONE CAROUSEL
    // ==========================================================================

    document.querySelectorAll('.hiw-carousel').forEach(function(carousel) {
        var slides = carousel.querySelectorAll('.hiw-slide');
        var dots = carousel.querySelectorAll('.hiw-dot');
        var slidesContainer = carousel.querySelector('.hiw-slides');
        if (slides.length === 0) return;

        var current = 0;
        var total = slides.length;
        var timer = null;
        var INTERVAL = 6000;
        var touchStartX = 0;
        var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function goTo(n) {
            slides[current].classList.remove('hiw-slide-active');
            dots[current].classList.remove('hiw-dot-active');
            current = ((n % total) + total) % total;
            slides.forEach(function(s) { s.classList.remove('hiw-slide-active'); });
            slides[current].classList.add('hiw-slide-active');
            dots[current].classList.add('hiw-dot-active');
        }

        function startTimer() {
            if (reducedMotion) return;
            clearInterval(timer);
            timer = setInterval(function() { goTo(current + 1); }, INTERVAL);
        }

        dots.forEach(function(dot) {
            dot.addEventListener('click', function() {
                goTo(parseInt(this.getAttribute('data-hiw-dot')));
                startTimer();
            });
        });

        if (slidesContainer) {
            slidesContainer.addEventListener('touchstart', function(e) {
                touchStartX = e.changedTouches[0].screenX;
                clearInterval(timer);
            }, { passive: true });

            slidesContainer.addEventListener('touchend', function(e) {
                var diff = touchStartX - e.changedTouches[0].screenX;
                if (Math.abs(diff) > 50) {
                    goTo(diff > 0 ? current + 1 : current - 1);
                }
                startTimer();
            }, { passive: true });
        }

        startTimer();
    });

    // DEVELOPMENT LOG
    // ==========================================================================
    
    // Console message for debugging (can be removed in production)
    // console.log("Prokaiwa script loaded");
    
    // ==========================================================================
    // DYNAMIC NAV: Show Dashboard if logged in, Login if not
    // ==========================================================================
    
    async function updateNavForAuthState() {
        try {
            const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm');
            
            const supabase = createClient(
                'https://luyzyzefgintksydmwoh.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1eXp5emVmZ2ludGtzeWRtd29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NzYyMDUsImV4cCI6MjA2ODU1MjIwNX0.he5_j99ZtAj4K_zzgm11NEEv7TrbRJYndJXot25s_Kg',
                {
                    auth: {
                        persistSession: true,
                        storageKey: 'prokaiwa-supabase-auth',
                        storage: window.localStorage,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                }
            );
            
            const { data: { session } } = await supabase.auth.getSession();
            const loginLink = document.querySelector('#auth-nav-link');
            
            if (loginLink) {
                if (session) {
                    // User is logged in
                    loginLink.href = '/dashboard.html';
                    loginLink.textContent = 'Dashboard';
                } else {
                    // User is not logged in
                    loginLink.href = '/login.html';
                    loginLink.textContent = 'Log In';
                }
                // Reveal the link after decision is made
                loginLink.style.visibility = 'visible';
            }
            
        } catch (error) {
            // On error, default to Log In and show it
            const loginLink = document.querySelector('#auth-nav-link');
            if (loginLink) {
                loginLink.href = '/login.html';
                loginLink.textContent = 'Log In';
                loginLink.style.visibility = 'visible';
            }
        }
    }
    
    updateNavForAuthState();

});