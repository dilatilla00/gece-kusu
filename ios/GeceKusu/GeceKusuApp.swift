import SwiftUI

@main
struct GeceKusuApp: App {
    /// Oyun sayfası yüklenene kadar açılış ekranındaki amblem görünür kalır.
    @State private var loaded = false

    var body: some Scene {
        WindowGroup {
            ZStack {
                Color("LaunchBg").ignoresSafeArea()
                GameView(loaded: $loaded)
                    .ignoresSafeArea()
                    .opacity(loaded ? 1 : 0)
                if !loaded {
                    Image("Emblem")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 160)
                        .transition(.opacity)
                }
            }
            .animation(.easeOut(duration: 0.35), value: loaded)
            .statusBarHidden(true)
            .persistentSystemOverlays(.hidden)
        }
    }
}
