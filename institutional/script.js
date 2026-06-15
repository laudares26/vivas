// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// Mobile menu
const mobileMenu = document.getElementById('mobileMenu');
const mobileOverlay = document.getElementById('mobileOverlay');

mobileMenu.addEventListener('click', () => {
  mobileOverlay.classList.toggle('active');
  document.body.style.overflow = mobileOverlay.classList.contains('active') ? 'hidden' : '';
});

mobileOverlay.addEventListener('click', (e) => {
  if (e.target === mobileOverlay) closeMobile();
});

function closeMobile() {
  mobileOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80;
      const pos = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: pos, behavior: 'smooth' });
    }
  });
});

// Intersection Observer for animations
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.solution-card, .feature-item, .ai-card, .contact-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});

// Add visible class styles
const style = document.createElement('style');
style.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }';
document.head.appendChild(style);

// Stagger animation for grid items
document.querySelectorAll('.solutions-grid, .ai-grid, .features-grid, .contact-grid').forEach(grid => {
  const gridObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const children = entry.target.children;
        Array.from(children).forEach((child, i) => {
          child.style.transitionDelay = `${i * 100}ms`;
        });
        gridObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  gridObserver.observe(grid);
});
