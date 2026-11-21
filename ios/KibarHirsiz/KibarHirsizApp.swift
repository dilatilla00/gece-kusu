import SwiftUI
import AVFoundation

@main
struct KibarHirsizApp: App {
    /// Oyun sayfası yüklenene kadar açılış ekranındaki amblem görünür kalır.
    @State private var loaded = false

    init() {
        // Oyun sesleri telefonun sessiz düğmesine uysun ve çalan başka müziği kesmesin.
        try? AVAudioSession.sharedInstance().setCategory(.ambient, options: [.mixWithOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
        Notifier.shared.activate()
    }

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
