import SwiftUI
import WebKit

/// Oyunu uygulamanın içindeki "Web" klasöründen, internet gerekmeden açar.
struct GameView: UIViewRepresentable {
    @Binding var loaded: Bool

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: BundleSchemeHandler.scheme)
        config.websiteDataStore = .default() // kayıtlar (localStorage) kalıcı olsun

        // Oyundaki JavaScript hatalarını Xcode konsoluna yaz.
        config.userContentController.add(context.coordinator, name: "log")
        config.userContentController.add(context.coordinator, name: "ready")
        config.userContentController.addUserScript(WKUserScript(source: """
            window.addEventListener('error', e => webkit.messageHandlers.log.postMessage('JS hata: ' + e.message + ' @ ' + e.filename + ':' + e.lineno));
            window.addEventListener('unhandledrejection', e => webkit.messageHandlers.log.postMessage('JS hata: ' + e.reason));
            """, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true }
        #endif
        let bg = UIColor(named: "LaunchBg") ?? .black
        web.isOpaque = false
        web.backgroundColor = bg
        web.scrollView.backgroundColor = bg
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.bounces = false
        web.scrollView.isScrollEnabled = false // sayfanın kendisi kaymasın; listeler yine kayar
        web.allowsLinkPreview = false

        web.load(URLRequest(url: URL(string: "\(BundleSchemeHandler.scheme)://app/index.html")!))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(loaded: $loaded) }

    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        let loaded: Binding<Bool>
        init(loaded: Binding<Bool>) { self.loaded = loaded }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "ready" { loaded.wrappedValue = true; return } // açılış ekranı çizildi
            NSLog("[KibarHirsiz] %@", String(describing: message.body))
        }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            NSLog("[KibarHirsiz] sayfa yüklendi: %@", webView.url?.absoluteString ?? "-")
            // Sayfa çizim sinyali gelmezse amblemi yine de birkaç saniye sonra kaldır.
            DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [loaded] in loaded.wrappedValue = true }
            #if DEBUG
            let probe = "JSON.stringify({w: innerWidth, h: innerHeight, g: document.querySelector('.game')?.getBoundingClientRect(), cls: document.querySelector('.game')?.className, ui: document.getElementById('ui')?.children.length, game: typeof window.Game})"
            webView.evaluateJavaScript(probe) { r, e in NSLog("[KibarHirsiz] durum: %@", String(describing: r ?? e)) }
            #endif
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            NSLog("[KibarHirsiz] sayfa açılamadı: %@", error.localizedDescription)
        }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            NSLog("[KibarHirsiz] sayfa hatası: %@", error.localizedDescription)
        }
    }
}

/// gecekusu://app/... isteklerini uygulama paketindeki Web klasöründen yanıtlar.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "gecekusu"
    private let root = Bundle.main.resourceURL!.appendingPathComponent("Web").standardizedFileURL

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL

        guard file.path.hasPrefix(root.path), let data = try? Data(contentsOf: file) else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        let headers = [
            "Content-Type": Self.mime(file.pathExtension),
            "Content-Length": String(data.count),
            "Cache-Control": "no-cache",
        ]
        let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    private static func mime(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "js": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json": return "application/json; charset=utf-8"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "woff2": return "font/woff2"
        case "woff": return "font/woff"
        case "ttf": return "font/ttf"
        default: return "application/octet-stream"
        }
    }
}
