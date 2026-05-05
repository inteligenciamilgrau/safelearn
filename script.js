document.addEventListener('DOMContentLoaded', () => {
    console.log('SafeLearn Guide Initialized! 🛡️');

    const scoreElement = document.getElementById('security-score');
    const progressBar = document.getElementById('page-progress');
    const startBtn = document.getElementById('start-guide');
    const toast = document.getElementById('toast');
    let currentScore = 0;

    // 1. Botão de Início
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            document.getElementById('step-1').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // 2. Interatividade dos Cards (Step 1)
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('active');
        });
    });

    // 3. Sistema de Score e Checklist (Step 2)
    document.querySelectorAll('.checklist-item').forEach(item => {
        item.addEventListener('click', () => {
            const points = parseInt(item.getAttribute('data-points'));
            
            if (item.classList.contains('active')) {
                item.classList.remove('active');
                currentScore -= points;
            } else {
                item.classList.add('active');
                currentScore += points;
            }
            
            // Update Score with animation
            animateValue(scoreElement, parseInt(scoreElement.innerText), currentScore, 500);
        });
    });

    // 4. Copiar Código (Step 3)
    const copyBtn = document.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const code = document.getElementById('code-content').innerText;
            navigator.clipboard.writeText(code).then(() => {
                showToast();
            });
        });
    }

    // 5. Barra de Progresso de Leitura
    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        progressBar.style.width = scrolled + "%";
    });

    // Funções Auxiliares
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    function showToast() {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});
