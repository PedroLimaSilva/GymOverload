//
//  ContentView.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//

import SwiftUI
import SwiftData

struct ContentView: View {
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
    }
}

#Preview {
    ContentView()
        .modelContainer(PreviewData.container)
}
