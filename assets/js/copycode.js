<!-- Кнопка «Копировать»: подключите один раз на странице -->

document.querySelectorAll('.code-block__copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
        var code = btn.closest('.code-block').querySelector('pre code');
        var done = function () {
            btn.textContent = 'Скопировано!';
            btn.classList.add('is-copied');
            setTimeout(function () {
                btn.textContent = 'Копировать';
                btn.classList.remove('is-copied');
            }, 1600);
        };
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(code.innerText).then(done);
        } else {
            var ta = document.createElement('textarea');
            ta.value = code.innerText;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); done(); } catch (e) {}
            document.body.removeChild(ta);
        }
    });
});
