//
//  ContentView.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//

import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var context
    @State private var syncObserver: SyncObserver? = nil
    @State private var hasInitialized = false

    var body: some View {
        TabView {
            ExerciseListView()
                .tabItem {
                    Label("Exercises", systemImage: "dumbbell")
                }

            WorkoutTemplateList()
                .tabItem {
                    Label("Templates", systemImage: "list.bullet.clipboard")
                }
        }
        .onAppear {
            if syncObserver == nil {
                syncObserver = SyncObserver(context: context)
            }

            if !hasInitialized {
                hasInitialized = true
                Task {
                    await InitialDataLoader.preloadIfNeeded(context: context)
                }
            }
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(PreviewData.container)
}
