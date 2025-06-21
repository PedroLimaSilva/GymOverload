//
//  GymOverloadWatchApp.swift
//  GymOverloadWatch Watch App
//
//  Created by Pedro Lima e Silva on 21/06/2025.
//

import SwiftUI
import SwiftData

@main
struct GymOverloadWatchApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(SharedModelContainer.container)
    }
}
