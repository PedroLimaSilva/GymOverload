//
//  ExerciseDetailView.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//


import SwiftUI
import SwiftData

struct ExerciseDetailView: View {
    let exercise: Exercise

    var body: some View {
        Form {
            Section(header: Text("Name")) {
                Text(exercise.name)
            }

            Section(header: Text("Categories")) {
                Text(exercise.categories.map(\.rawValue).joined(separator: ", "))
            }

            Section(header: Text("Defaults")) {
                HStack {
                    Text("Rest Time")
                    Spacer()
                    Text("\(exercise.defaultRestSeconds) seconds")
                }
                HStack {
                    Text("Weight Unit")
                    Spacer()
                    Text(exercise.weightUnit)
                }
                HStack {
                    Text("Increment (kg)")
                    Spacer()
                    Text("\(exercise.weightIncrementKg, specifier: "%.1f")")
                }
                HStack {
                    Text("Increment (lb)")
                    Spacer()
                    Text("\(exercise.weightIncrementLb, specifier: "%.1f")")
                }
            }

            Section(header: Text("Kind")) {
                Text(exercise.kind)
            }

            Toggle("Double Weight For Volume", isOn: .constant(exercise.doubleWeightForVolume))
                .disabled(true)

            if let notes = exercise.notes, !notes.isEmpty {
                Section(header: Text("Notes")) {
                    Text(notes)
                }
            }
        }
        .navigationTitle(exercise.name)
    }
}

#Preview {
    let context = PreviewData.container.mainContext
    let exercise = try! context.fetch(FetchDescriptor<Exercise>()).first!

    return ExerciseDetailView(exercise: exercise)
        .modelContainer(PreviewData.container)
}


