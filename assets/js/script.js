/**
 * Prokaiwa Website - Main JavaScript
 * Improved Version - Stable and Production-Ready
 * 
 * Features:
 * - Language switching (original working logic kept)
 * - Accessible FAQ accordion
 * - Responsive burger menu with enhancements
 * - Keyboard navigation support
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
        function setLanguage(lang) {
            // Validate language
            if (lang !== 'ja' && lang !== 'en') {
                console.warn('Invalid language:', lang);
                return;
            }
            
            // Save preference with better key name
            localStorage.setItem('prokaiwa_preferred_language', lang);

            const isJapanese = lang === 'ja';
            document.documentElement.lang = lang;

            // Use original working logic - query fresh each time
            const allLangElements = document.body.querySelectorAll('[lang="ja"], [lang="en"]');
            allLangElements.forEach(el => {
                if (el.closest('.nav-lang-toggle')) return;

                if (el.getAttribute('lang') === lang) {
                    el.style.display = '';
                    el.removeAttribute('aria-hidden');
                    
                    if (el.classList.contains('lang-section')) {
                        el.classList.add('show');
                    }
                } else {
                    el.style.display = 'none';
                    el.setAttribute('aria-hidden', 'true');
                    
                    if (el.classList.contains('lang-section')) {
                        el.classList.remove('show');
                    }
                }
            });

            // Update button states with ARIA
            const jaButton = langToggle.querySelector('[data-lang="ja"]');
            const enButton = langToggle.querySelector('[data-lang="en"]');
            
            if (jaButton && enButton) {
                jaButton.classList.toggle('active', isJapanese);
                enButton.classList.toggle('active', !isJapanese);
                
                // Add ARIA for accessibility
                jaButton.setAttribute('aria-pressed', isJapanese ? 'true' : 'false');
                enButton.setAttribute('aria-pressed', isJapanese ? 'false' : 'true');
            }
        }

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
            // Fallback to old key for backwards compatibility
            const oldSavedLang = localStorage.getItem('prokaiwaLang');
            if (oldSavedLang === 'ja' || oldSavedLang === 'en') {
                setLanguage(oldSavedLang);
            } else {
                // Detect browser language
                const userLang = (navigator.language || navigator.userLanguage).split('-')[0];
                setLanguage(userLang === 'ja' ? 'ja' : 'en');
            }
        }
    }
    
    
    // ==========================================================================
    // BURGER MENU FUNCTIONALITY (ENHANCED)
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
                if (!mainNav.contains(event.target) && !burgerMenu.contains(event.target)) {
                    toggleMenu(false);
                }
            }
        });
        
        // Close menu when pressing Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && mainNav.classList.contains('open')) {
                toggleMenu(false);
                burgerMenu.focus(); // Return focus for keyboard users
            }
        });
        
        // Close menu when window is resized to desktop size
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
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
    // FAQ ACCORDION FUNCTIONALITY (ENHANCED)
    // ==========================================================================
    
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    if (faqQuestions.length > 0) {
        // Get all answers once, outside the loop
        const allAnswers = document.querySelectorAll('.faq-answer');
        
        // Keep track of currently open answer for ARIA
        let currentOpenAnswer = null;
        let currentOpenQuestion = null;
        
        faqQuestions.forEach((question, index) => {
            const answer = question.nextElementSibling;
            
            // Validate that answer exists
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
                const wasOpen = answer.classList.contains('open');
                
                // Close all answers
                allAnswers.forEach(ans => {
                    ans.style.maxHeight = null;
                    ans.classList.remove('open');
                });
                
                // Update all questions' ARIA
                faqQuestions.forEach(q => {
                    q.setAttribute('aria-expanded', 'false');
                });
                
                // If the clicked one wasn't already open, open it
                if (!wasOpen) {
                    answer.classList.add('open');
                    answer.style.maxHeight = (answer.scrollHeight + 40) + 'px';
                    question.setAttribute('aria-expanded', 'true');
                    currentOpenAnswer = answer;
                    currentOpenQuestion = question;
                } else {
                    currentOpenAnswer = null;
                    currentOpenQuestion = null;
                }
            }
            
            // Handle clicks
            question.addEventListener('click', toggleFAQ);
            
            // Handle Enter and Space key presses
            question.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault(); // Prevent page scroll on Space
                    toggleFAQ();
                }
            });
        });
        
        // Recalculate maxHeight on window resize
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
            }
        });
    });
    
    
    // ==========================================================================
    // CONSOLE MESSAGE (For Development)
    // ==========================================================================
    
    console.log('✅ Prokaiwa script loaded successfully');
    console.log('📱 Burger menu:', burgerMenu ? 'Found' : 'Not found');
    console.log('🌐 Language toggle:', langToggle ? 'Found' : 'Not found');
    console.log('❓ FAQ items:', faqQuestions.length);
    
});
