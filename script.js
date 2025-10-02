// 信封动画交互逻辑
class EnvelopeAnimation {
    constructor() {
        this.envelope = document.getElementById('envelope');
        this.isOpen = false;
        this.startY = 0;
        this.currentY = 0;
        this.isAnimating = false;

        this.init();
    }

    init() {
        this.bindEvents();
        this.addSwipeHint();
    }

    bindEvents() {
        // 触摸事件
        this.envelope.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        this.envelope.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        this.envelope.addEventListener('touchend', this.onTouchEnd.bind(this));

        // 鼠标事件（用于桌面端测试）
        this.envelope.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));

        // 点击打开（备选方案）
        this.envelope.addEventListener('click', this.toggleEnvelope.bind(this));
    }

    onTouchStart(e) {
        if (this.isAnimating) return;

        this.startY = e.touches[0].clientY;
        this.currentY = this.startY;

        // 添加视觉反馈
        this.envelope.style.transform = 'scale(0.98)';
    }

    onTouchMove(e) {
        if (this.isAnimating) return;

        e.preventDefault();
        this.currentY = e.touches[0].clientY;

        const deltaY = this.currentY - this.startY;

        // 向上滑动打开信封
        if (deltaY < -50 && !this.isOpen) {
            this.openEnvelope();
        }
        // 向下滑动关闭信封
        else if (deltaY > 50 && this.isOpen) {
            this.closeEnvelope();
        }
    }

    onTouchEnd(e) {
        // 恢复视觉反馈
        this.envelope.style.transform = '';
    }

    onMouseDown(e) {
        if (this.isAnimating) return;

        this.startY = e.clientY;
        this.currentY = this.startY;

        this.envelope.style.transform = 'scale(0.98)';

        // 阻止默认行为
        e.preventDefault();
    }

    onMouseMove(e) {
        if (this.isAnimating || this.startY === 0) return;

        this.currentY = e.clientY;

        const deltaY = this.currentY - this.startY;

        // 向上滑动打开信封
        if (deltaY < -50 && !this.isOpen) {
            this.openEnvelope();
        }
        // 向下滑动关闭信封
        else if (deltaY > 50 && this.isOpen) {
            this.closeEnvelope();
        }
    }

    onMouseUp(e) {
        this.envelope.style.transform = '';
        this.startY = 0;
    }

    toggleEnvelope() {
        if (this.isAnimating) return;

        if (this.isOpen) {
            this.closeEnvelope();
        } else {
            this.openEnvelope();
        }
    }

    openEnvelope() {
        if (this.isAnimating || this.isOpen) return;

        this.isAnimating = true;
        this.isOpen = true;

        // 添加打开动画类
        this.envelope.classList.add('open');

        // 播放打开音效（如果有的话）
        this.playSound('open');

        // 动画完成后重置标志
        setTimeout(() => {
            this.isAnimating = false;
        }, 600);

        // 显示纸条动画
        setTimeout(() => {
            const paperContent = this.envelope.querySelector('.paper-content');
            if (paperContent) {
                paperContent.style.opacity = '1';
                paperContent.style.transform = 'translateY(0)';
            }
        }, 300);
    }

    closeEnvelope() {
        if (this.isAnimating || !this.isOpen) return;

        this.isAnimating = true;
        this.isOpen = false;

        // 隐藏纸条内容
        const paperContent = this.envelope.querySelector('.paper-content');
        if (paperContent) {
            paperContent.style.opacity = '0';
            paperContent.style.transform = 'translateY(20px)';
        }

        // 延迟移除打开动画类
        setTimeout(() => {
            this.envelope.classList.remove('open');
        }, 100);

        // 播放关闭音效
        this.playSound('close');

        // 动画完成后重置标志
        setTimeout(() => {
            this.isAnimating = false;
        }, 600);
    }

    playSound(type) {
        // 这里可以添加音效，暂时留空
        // 如果需要音效，可以创建Audio对象
        /*
        if (type === 'open') {
            const audio = new Audio('open-envelope.mp3');
            audio.volume = 0.3;
            audio.play().catch(e => console.log('Audio play failed:', e));
        } else if (type === 'close') {
            const audio = new Audio('close-envelope.mp3');
            audio.volume = 0.3;
            audio.play().catch(e => console.log('Audio play failed:', e));
        }
        */
    }

    addSwipeHint() {
        // 添加滑动提示动画
        const hint = document.createElement('div');
        hint.className = 'swipe-hint';
        hint.innerHTML = '👆 向上滑动打开信封';
        hint.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
            font-weight: 500;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            animation: bounce 2s infinite;
            pointer-events: none;
            z-index: 10;
        `;

        // 添加bounce动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% {
                    transform: translateX(-50%) translateY(0);
                }
                40% {
                    transform: translateX(-50%) translateY(-10px);
                }
                60% {
                    transform: translateX(-50%) translateY(-5px);
                }
            }
        `;
        document.head.appendChild(style);

        // 添加到容器中
        const container = document.querySelector('.container');
        container.appendChild(hint);

        // 3秒后淡出提示
        setTimeout(() => {
            hint.style.transition = 'opacity 1s ease';
            hint.style.opacity = '0';
            setTimeout(() => {
                if (hint.parentNode) {
                    hint.parentNode.removeChild(hint);
                }
            }, 1000);
        }, 3000);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new EnvelopeAnimation();
});

// 添加一些额外的视觉效果
document.addEventListener('DOMContentLoaded', () => {
    // 为纸条内容添加淡入动画
    const paperContent = document.querySelector('.paper-content');
    if (paperContent) {
        paperContent.style.opacity = '0';
        paperContent.style.transform = 'translateY(20px)';
        paperContent.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    }

    // 添加信封轻微的浮动动画
    const envelope = document.getElementById('envelope');
    if (envelope) {
        let floatDirection = 1;
        setInterval(() => {
            if (!envelope.classList.contains('open')) {
                const currentTransform = envelope.style.transform || '';
                const match = currentTransform.match(/translateY\(([^)]+)px\)/);
                const currentY = match ? parseFloat(match[1]) : 0;

                if (Math.abs(currentY) >= 5) {
                    floatDirection *= -1;
                }

                const newY = currentY + (floatDirection * 0.5);
                envelope.style.transform = `translateY(${newY}px)`;
            }
        }, 100);
    }
});