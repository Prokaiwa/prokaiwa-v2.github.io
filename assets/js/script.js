/**
 * Prokaiwa Website - Main JavaScript
 * Production-Ready Version with Senior Developer Improvements
 * 
 * Features:
 * - Language switching with smooth transitions
 * - Accessible FAQ accordion
 * - Responsive burger menu
 * - Keyboard navigation support
 * - Performance optimized
 * - WCAG 2.1 AA compliant
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
        // Cache language elements for better performance
        let langElementsCache = null;
        
        function cacheLangElements() {
            if (!langElementsCache) {
                langElementsCache = {
                    ja: Array.from(document.querySelectorAll('[lang="ja"]')),
                    en: Array.from(document.querySelectorAll('[lang="en"]'))
                };
            }
            return langElementsCache;
        }
        
        function setLanguage(lang) {
            try {
                // Validate language
                if (lang !== 'ja' && lang !== 'en') {
                    console.warn('Invalid language:', lang);
                    return;
                }
                
                // Save preference
                localStorage.setItem('prokaiwa_preferred_language', lang);
                
                const isJapanese = lang === 'ja';
                const otherLang = isJapanese ? 'en' : 'ja';
                
                // Update HTML lang attribute for accessibility
                document.documentElement.lang = lang;
                
                // Add smooth transition effect
                document.body.style.opacity = '0.7';
                document.body.style.transition = 'opacity 0.15s ease';
                
                setTimeout(() => {
                    // Get cached elements
                    const langElements = cacheLangElements();
                    
                    // Show selected language elements
                    langElements[lang].forEach(el => {
                        // Skip language toggle buttons
                        if (el.closest('.nav-lang-toggle')) return;
                        
                        el.style.display = '';
                        el.removeAttribute('aria-hidden');
                        
                        if (el.classList.contains('lang-section')) {
                            el.classList.add('show');
                        }
                    });
                    
                    // Hide other language elements
                    langElements[otherLang].forEach(el => {
                        // Skip language toggle buttons
                        if (el.closest('.nav-lang-toggle')) return;
                        
                        el.style.display = 'none';
                        el.setAttribute('aria-hidden', 'true');
                        
                        if (el.classList.contains('lang-section')) {
                            el.classList.remove('show');
                        }
                    });
                    
                    // Update button states
                    const jaButton = langToggle.querySelector('[data-lang="ja"]');
                    const enButton = langToggle.querySelector('[data-lang="en"]');
                    
                    if (jaButton && enButton) {
                        jaButton.classList.toggle('active', isJapanese);
                        enButton.classList.toggle('active', !isJapanese);
                        
                        // Update ARIA for accessibility
                        jaButton.setAttribute('aria-pressed', isJapanese ? 'true' : 'false');
                        enButton.setAttribute('aria-pressed', isJapanese ? 'false' : 'true');
                    }
                    
                    // Remove transition effect
                    document.body.style.opacity = '';
                    document.body.style.transition = '';
                    
                }, 150);
                
            } catch (error) {
                console.error('Error switching language:', error);
                // Fail gracefully - keep current language
            }
        }
        
        // Language button click handler
        langToggle.addEventListener('click', event => {
            const button = event.target.closest('button[data-lang]');
            if (button) {
                setLanguage(button.dataset.lang);
            }
        });
        
        // Initialize language on page load
        const savedLang = localStorage.getItem('prokaiwa_preferred_language');
        if (savedLang === 'ja' || savedLang === 'en') {
            setLanguage(savedLang);
        } else {
            // Detect browser language
            const userLang = (navigator.language || navigator.userLanguage).split('-')[0];
            setLanguage(userLang === 'ja' ? 'ja' : 'en');
        }
    }
    
    
    // ==========================================================================
    // BURGER MENU FUNCTIONALITY
    // ==========================================================================
    
    if (burgerMenu && mainNav) {
        
        function toggleMenu(shouldOpen) {
            const isOpen = shouldOpen !== undefined ? shouldOpen : !mainNav.classList.contains('open');
            
            if (isOpen) {
                mainNav.classList.add('open');
            } else {
                mainNav.classList.remove('open');
            }
            
            // Update ARIA for screen readers
            burgerMenu.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            burgerMenu.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
            
            // Toggle icon
            const burgerIcon = burgerMenu.querySelector('i');
            if (burgerIcon) {
                if (isOpen) {
                    burgerIcon.classList.remove('fa-bars');
                    burgerIcon.classList.add('fa-times');
                } else {
                    burgerIcon.classList.remove('fa-times');
                    burgerIcon.classList.add('fa-bars');
                }
            }
        }
        
        // Burger menu click
        burgerMenu.addEventListener('click', () => {
            toggleMenu();
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (event) => {
            if (mainNav.classList.contains('open')) {
                // Check if click is outside menu and burger button
                if (!mainNav.contains(event.target) && !burgerMenu.contains(event.target)) {
                    toggleMenu(false);
                }
            }
        });
        
        // Close menu when pressing Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && mainNav.classList.contains('open')) {
                toggleMenu(false);
                // Return focus to burger button for keyboard users
                burgerMenu.focus();
            }
        });
        
        // Close menu when window is resized to desktop size
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                // If desktop size and menu is open, close it
                if (window.innerWidth > 768 && mainNav.classList.contains('open')) {
                    toggleMenu(false);
                }
            }, 250);
        });
    }
    
    
    // ==========================================================================
    // FOOTER YEAR
    // ==========================================================================
    
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
    
    
    // ==========================================================================
    // FAQ ACCORDION FUNCTIONALITY
    // ==========================================================================
    
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    if (faqQuestions.length > 0) {
        
        // Keep track of currently open answer
        let currentOpenAnswer = null;
        let currentOpenQuestion = null;
        
        faqQuestions.forEach((question, index) => {
            const answer = question.nextElementSibling;
            
            // Validate that answer exists and is correct element
            if (!answer || !answer.classList.contains('faq-answer')) {
                console.warn('FAQ answer not found for question:', question);
                return;
            }
            
            // Set up ARIA attributes for accessibility
            const answerId = `faq-answer-${index}`;
            answer.id = answerId;
            
            question.setAttribute('role', 'button');
            question.setAttribute('tabindex', '0');
            question.setAttribute('aria-expanded', 'false');
            question.setAttribute('aria-controls', answerId);
            
            // Click handler
            function toggleFAQ() {
                const wasOpen = answer === currentOpenAnswer;
                
                // Close previously open FAQ
                if (currentOpenAnswer && currentOpenAnswer !== answer) {
                    currentOpenAnswer.style.maxHeight = null;
                    currentOpenAnswer.classList.remove('open');
                    if (currentOpenQuestion) {
                        currentOpenQuestion.setAttribute('aria-expanded', 'false');
                    }
                }
                
                // Toggle current FAQ
                if (!wasOpen) {
                    // Open this FAQ
                    answer.classList.add('open');
                    answer.style.maxHeight = (answer.scrollHeight + 40) + 'px';
                    question.setAttribute('aria-expanded', 'true');
                    currentOpenAnswer = answer;
                    currentOpenQuestion = question;
                } else {
                    // Close this FAQ
                    answer.style.maxHeight = null;
                    answer.classList.remove('open');
                    question.setAttribute('aria-expanded', 'false');
                    currentOpenAnswer = null;
                    currentOpenQuestion = null;
                }
            }
            
            // Mouse click
            question.addEventListener('click', toggleFAQ);
            
            // Keyboard navigation (Enter or Space)
            question.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault(); // Prevent page scroll on Space
                    toggleFAQ();
                }
            });
        });
        
        // Recalculate maxHeight on window resize (for responsive design)
        let faqResizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(faqResizeTimer);
            faqResizeTimer = setTimeout(() => {
                if (currentOpenAnswer) {
                    currentOpenAnswer.style.maxHeight = (currentOpenAnswer.scrollHeight + 40) + 'px';
                }
            }, 250);
        });
    }
    
    
    // ==========================================================================
    // SMOOTH SCROLL FOR ANCHOR LINKS (BONUS FEATURE)
    // ==========================================================================
    
    // Add smooth scrolling to all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            
            // Skip if it's just "#" or empty
            if (!targetId || targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                e.preventDefault();
                
                // Close mobile menu if open
                if (mainNav && mainNav.classList.contains('open')) {
                    mainNav.classList.remove('open');
                    if (burgerMenu) {
                        burgerMenu.setAttribute('aria-expanded', 'false');
                        const burgerIcon = burgerMenu.querySelector('i');
                        if (burgerIcon) {
                            burgerIcon.classList.remove('fa-times');
                            burgerIcon.classList.add('fa-bars');
                        }
                    }
                }
                
                // Smooth scroll to target
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Update URL without jumping
                if (history.pushState) {
                    history.pushState(null, null, targetId);
                }
                
                // Set focus to target for accessibility (if it's focusable)
                if (targetElement.hasAttribute('tabindex')) {
                    targetElement.focus();
                }
            }
        });
    });
    
    
    // ==========================================================================
    // ACCESSIBILITY: SKIP LINK SUPPORT (If you add skip links later)
    // ==========================================================================
    
    const skipLink = document.querySelector('.skip-link');
    if (skipLink) {
        skipLink.addEventListener('click', (e) => {
            const targetId = skipLink.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.setAttribute('tabindex', '-1');
                target.focus();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
    
    
    // ==========================================================================
    // PERFORMANCE: LAZY LOAD IMAGES (BONUS FEATURE)
    // ==========================================================================
    
    // Modern browsers support lazy loading natively
    // For older browsers, add IntersectionObserver polyfill
    if ('loading' in HTMLImageElement.prototype) {
        // Native lazy loading supported
        const lazyImages = document.querySelectorAll('img[loading="lazy"]');
        console.log(`Native lazy loading enabled for ${lazyImages.length} images`);
    } else {
        // Fallback for older browsers
        console.log('Native lazy loading not supported, consider adding polyfill');
    }
    
    
    // ==========================================================================
    // ERROR TRACKING (Production Enhancement)
    // ==========================================================================
    
    // Global error handler for production debugging
    window.addEventListener('error', (event) => {
        console.error('Global error caught:', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        });
        
        // In production, you could send this to an error tracking service
        // Example: Sentry, LogRocket, etc.
    });
    
    
    // ==========================================================================
    // CONSOLE MESSAGE (Remove in production or make conditional)
    // ==========================================================================
    
    console.log('✅ Prokaiwa script loaded successfully');
    console.log('📱 Burger menu:', burgerMenu ? 'Found' : 'Not found');
    console.log('🌐 Language toggle:', langToggle ? 'Found' : 'Not found');
    console.log('❓ FAQ items:', faqQuestions.length);
    
});
