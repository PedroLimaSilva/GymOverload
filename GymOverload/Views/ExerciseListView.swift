//
//  ExerciseListView.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//

import SwiftUI
import SwiftData

struct ExerciseListView: View {
    @Query private var exercises: [Exercise]
    
    var body: some View {
        NavigationStack {
            List {
                ForEach(exercises) { exercise in
                    NavigationLink{
                        ExerciseDetailView(exercise: exercise)
                    } label: {
                        VStack(alignment: .leading) {
                            Text(exercise.name).font(.headline)
                            Text(exercise.categories.map(\.rawValue).joined(separator: ", "))
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Exercises")
        }
    }
}

#Preview {
    ExerciseListView()
        .modelContainer(PreviewData.container)
}
