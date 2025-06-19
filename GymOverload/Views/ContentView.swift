//
//  ContentView.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//

import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var workoutSets: [WorkoutSet]

    var body: some View {
        ExerciseListView()
            .modelContainer(for: Exercise.self)
    }
}

#Preview {
    ContentView()
        .modelContainer(PreviewData.container)
}
