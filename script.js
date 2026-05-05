document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-guide');
    const progressBar = document.getElementById('page-progress');

    // Smooth Scroll para o botão de início
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            const firstSection = document.getElementById('intro');
            firstSection.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Barra de Progresso de Leitura
    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        if (progressBar) {
            progressBar.style.width = scrolled + "%";
        }
    });

    // Animação de entrada (Intersection Observer)
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.phase-section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'all 0.8s ease-out';
        observer.observe(section);
    });
});
