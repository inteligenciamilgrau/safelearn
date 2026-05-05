// Confirmação de carregamento
console.log('Mozilla Observatory Guide JS Loaded! 🚀');

// Funções Principais
function toggleItem(element) {
    element.classList.toggle('active');
    
    // Efeito de escala ao clicar
    element.style.transform = 'scale(0.98)';
    setTimeout(() => {
        element.style.transform = 'scale(1)';
    }, 100);
}

function copyCode() {
    const code = document.getElementById('code-content').innerText;
    const btn = document.querySelector('.copy-btn');
    
    navigator.clipboard.writeText(code).then(() => {
        const originalText = btn.innerText;
        btn.innerText = 'Copiado!';
        btn.style.background = '#00ff88';
        
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = 'var(--accent-cyan)';
        }, 2000);
    }).catch(err => {
        console.error('Erro ao copiar:', err);
    });
}

// Inicialização de Eventos (Compatível com CSP restrito)
document.addEventListener('DOMContentLoaded', () => {
    // Checklist items
    document.querySelectorAll('.checklist-item').forEach(item => {
        item.addEventListener('click', () => toggleItem(item));
    });

    // Copy button
    const copyBtn = document.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyCode);
    }

    // Scroll reveal animation logic
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.card, .checklist-item, .code-block').forEach(el => {
        observer.observe(el);
    });
});
