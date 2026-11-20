import SwiftUI

@main
struct GeceKusuApp: App {
    var body: some Scene {
        WindowGroup {
            GameView()
                .ignoresSafeArea()
                .background(Color("LaunchBg").ignoresSafeArea())
                .statusBarHidden(true)
                .persistentSystemOverlays(.hidden)
        }
    }
}
