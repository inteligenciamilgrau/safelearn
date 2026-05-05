function toggleItem(element) {
    element.classList.toggle('active');
    
    // Add a little scale effect on click
    element.style.transform = 'scale(0.98)';
    setTimeout(() => {
        element.style.transform = 'scale(1)';
    }, 100);
}

function copyCode() {
    const code = document.getElementById('code-content').innerText;
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.innerText;
        btn.innerText = 'Copiado!';
        btn.style.background = '#00ff88';
        
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = 'var(--accent-cyan)';
        }, 2000);
    });
}

// Simple reveal animation on scroll
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.card, .checklist-item, .code-block').forEach(el => {
    // Re-applying animation logic for scroll reveal if needed, 
    // though most are already triggered by page load classes.
});

console.log('Mozilla Observatory Guide Loaded! 🚀');
