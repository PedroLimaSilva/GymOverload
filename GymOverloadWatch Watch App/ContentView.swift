//
//  ContentView.swift
//  GymOverloadWatch Watch App
//
//  Created by Pedro Lima e Silva on 21/06/2025.
//

import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var context
    @State private var hasInitialized = false
    @StateObject private var syncManager: WatchDataReceiver

    init() {
        _syncManager = StateObject(wrappedValue: WatchDataReceiver(context: .placeholder))
    }

    var body: some View {
        WorkoutTemplateList()
            .environmentObject(syncManager) // Optional: if needed inside subviews
            .onAppear {
                #if DEBUG
                do {
                    print("🧹 Cleaning up storage files")
                    let supportURL = try FileManager.default.url(
                        for: .applicationSupportDirectory,
                        in: .userDomainMask,
                        appropriateFor: nil,
                        create: true
                    )
                    let storeURL = supportURL.appendingPathComponent("default.store")
                    if FileManager.default.fileExists(atPath: storeURL.path) {
                        try FileManager.default.removeItem(at: storeURL)
                        print("✅ Deleted corrupted SwiftData store on Watch")
                    } else {
                        print("❌ File does not exist")
                    }
                } catch {
                    print("❌ Failed to delete Watch SwiftData store: \(error)")
                }
                #endif
            
                if syncManager.contextIsPlaceholder {
                    print("Set Context")
                    syncManager.setContext(context)
                }

                guard !hasInitialized else { return }
                hasInitialized = true
                Task {
                    await InitialDataLoader.preloadIfNeeded(context: context)
                }
            }
    }
}

#Preview {
    ContentView().modelContainer(PreviewData.container)
}
