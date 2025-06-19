//
//  WorkoutTemplateDetailView.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//

import SwiftUI
import SwiftData

struct WorkoutTemplateDetailView: View {
    @Bindable var template: WorkoutTemplate
    @State private var isPickingExercise = false
    @State private var isOrderingExercises = false

    var body: some View {
        Group{
            if isOrderingExercises {
                EditExerciseOrderView(plannedExercises: $template.plannedExercises)
            } else {
                Form {
                    Section(header: Text("Template Name")) {
                        TextField("Name", text: $template.name)
                    }
                    
                    if template.plannedExercises.isEmpty {
                        Section {
                            Text("No exercises added yet").foregroundColor(.secondary)
                        }
                    } else {
                        ForEach(template.plannedExercises.indices, id: \.self) { index in
                            PlannedExerciseSection(plannedExercise: $template.plannedExercises[index])
                        }
                    }
                    
                    Section {
                        Button {
                            isPickingExercise = true
                        } label: {
                            Label("Add Exercise", systemImage: "plus")
                        }
                    }
                }
                
            }
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    isOrderingExercises.toggle()
                } label: {
                    Label(
                        isOrderingExercises ? "Done" : "Order Exercises",
                        systemImage: isOrderingExercises ? "checkmark" : "arrow.up.arrow.down"
                    )
                }
            }
        }
        .sheet(isPresented: $isPickingExercise) {
            ExerciseListView(
                onSelectMultiple: { selected in
                    for exercise in selected {
                        template.plannedExercises.append(
                            PlannedExercise(
                                exerciseName: exercise.name,
                                sets: []
                            )
                        )
                    }
                    isPickingExercise = false
                }
            )
        }
        .navigationTitle(template.name)
    }
}

#Preview {
    let sample = WorkoutTemplate(
        name: "Leg Day",
        plannedExercises: [
            PlannedExercise(
                exerciseName: "Squat",
                sets: [
                    PlannedSet(reps: 8, weight: 60, restSeconds: 90),
                    PlannedSet(reps: 6, weight: 80, restSeconds: 120)
                ]
            ),
            PlannedExercise(
                exerciseName: "Lunge",
                sets: [
                    PlannedSet(reps: 12, weight: 20, restSeconds: 60)
                ]
            )
        ]
    )

    return NavigationStack {
            WorkoutTemplateDetailView(template: sample)
        }
        .modelContainer(PreviewData.container)
}
