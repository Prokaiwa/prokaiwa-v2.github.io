// Wait for the page to fully load before running any code
document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const burgerMenu = document.querySelector('.burger-menu');
    const mainNav = document.querySelector('.main-nav');
    const langToggle = document.querySelector('.nav-lang-toggle');
    const yearSpan = document.getElementById('year');

    
    // --- Language Toggle Functionality ---
    if (langToggle) {
        function setLanguage(lang) {
            localStorage.setItem('prokaiwaLang', lang);

            const isJapanese = lang === 'ja';
            document.documentElement.lang = lang;

            const allLangElements = document.body.querySelectorAll('[lang="ja"], [lang="en"]');
            allLangElements.forEach(el => {
                if (el.closest('.nav-lang-toggle')) return;

                if (el.getAttribute('lang') === lang) {
                    el.style.display = '';
                    if (el.classList.contains('lang-section')) {
                        el.classList.add('show');
                    }
                } else {
                    el.style.display = 'none';
                    if (el.classList.contains('lang-section')) {
                        el.classList.remove('show');
                    }
                }
            });

            langToggle.querySelector('[data-lang="ja"]').classList.toggle('active', isJapanese);
            langToggle.querySelector('[data-lang="en"]').classList.toggle('active', !isJapanese);
        }

        langToggle.addEventListener('click', event => {
            const button = event.target.closest('button[data-lang]');
            if (button) {
                setLanguage(button.dataset.lang);
            }
        });

        const savedLang = localStorage.getItem('prokaiwaLang');
        if (savedLang && (savedLang === 'ja' || savedLang === 'en')) {
            setLanguage(savedLang);
        } else {
            const userLang = (navigator.language || navigator.userLanguage).split('-')[0];
            setLanguage(userLang === 'ja' ? 'ja' : 'en');
        }
    }
    
    
    // --- Burger Menu Functionality ---
    if (burgerMenu) {
        burgerMenu.addEventListener('click', () => {
            mainNav.classList.toggle('open');
            const burgerIcon = burgerMenu.querySelector('i');
            if (burgerIcon) {
                burgerIcon.classList.toggle('fa-bars');
                burgerIcon.classList.toggle('fa-times');
            }
        });
    }
    
    // --- Footer Year ---
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // --- FAQ Accordion Logic ---
    const faqQuestions = document.querySelectorAll('.faq-question');
    if (faqQuestions.length > 0) {
        // Get all answers once, outside the loop
        const allAnswers = document.querySelectorAll('.faq-answer');
        
        faqQuestions.forEach(question => {
            // Make FAQ keyboard accessible
            question.setAttribute('tabindex', '0');
            
            // Handle clicks
            question.addEventListener('click', () => {
                const answer = question.nextElementSibling;
                const wasOpen = answer.classList.contains('open');
                
                // Close all answers
                allAnswers.forEach(ans => {
                    ans.style.maxHeight = null;
                    ans.classList.remove('open');
                });
                
                // If the clicked one wasn't already open, open it
                if (!wasOpen) {
                    answer.classList.add('open');
                    answer.style.maxHeight = (answer.scrollHeight + 40) + 'px';
                }
            });
            
            // Handle Enter and Space key presses
            question.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault(); // Prevent page scroll on Space
                    question.click(); // Trigger the click event
                }
            });
        });
    }
});
