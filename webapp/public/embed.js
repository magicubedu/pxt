(function() {
    if (window.ksRunnerInit) return;

    var scripts = [
        "/blb/highlight.js/highlight.pack.js",
        "/blb/marked/marked.min.js",
    ]

    if (typeof jQuery == "undefined")
        scripts.unshift("/doccdn/jquery.js")
    if (typeof jQuery == "undefined" || !jQuery.prototype.sidebar)
        scripts.push("/doccdn/semantic.js")
    if (!window.pxtTargetBundle)
        scripts.push("/blb/target.js");
    scripts.push("/blb/pxtembed.js");

    var pxtCallbacks = []

    window.ksRunnerReady = function(f) {
        if (pxtCallbacks == null) f()
        else pxtCallbacks.push(f)
    }

    window.ksRunnerWhenLoaded = function() {
        pxt.docs.requireHighlightJs = function() { return hljs; }
        pxt.setupWebConfig(window.pxtConfig)
        pxt.runner.initCallbacks = pxtCallbacks
        pxtCallbacks.push(function() {
            pxtCallbacks = null
        })
        pxt.runner.init();
    }

    scripts.forEach(function(src) {
        var script = document.createElement('script');
        script.src = src;
        script.async = false;
        document.head.appendChild(script);
    })

} ())
