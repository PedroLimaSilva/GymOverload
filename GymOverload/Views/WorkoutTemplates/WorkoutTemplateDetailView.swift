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
    
    var body: some View {
        Form {
            Section(header: Text("Template Name")) {
                TextField("Name", text: $template.name)
            }
            
            Section(header: Text("Exercises")) {
                if template.plannedExercises.isEmpty {
                    Text("No exercises added yet").foregroundColor(.secondary)
                } else {
                    ForEach(Array(template.plannedExercises.enumerated()), id: \.element.id) { index, _ in
                        let binding = $template.plannedExercises[index]
                        VStack(alignment: .leading) {
                            Text(binding.exerciseName.wrappedValue)
                                .font(.headline)
                            HStack {
                                Stepper("Sets: \(binding.sets.wrappedValue)", value: binding.sets, in: 1...10)
                                Spacer()
                                Stepper("Reps: \(binding.reps.wrappedValue)", value: binding.reps, in: 1...30)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .onMove { indices, newOffset in
                        template.plannedExercises.move(fromOffsets: indices, toOffset: newOffset)
                    }
                    .onDelete { indices in
                        template.plannedExercises.remove(atOffsets: indices)
                    }
                }
                
                Button {
                    isPickingExercise = true
                } label: {
                    Label("Add Exercise", systemImage: "plus")
                }
            }
        }
        .sheet(isPresented: $isPickingExercise) {
            ExerciseListView(
                onSelectMultiple: { selected in
                    for exercise in selected {
                        template.plannedExercises.append(
                            PlannedExercise(exerciseName: exercise.name, sets: 3, reps: 10)
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
            PlannedExercise(exerciseName: "Squat", sets: 4, reps: 8),
            PlannedExercise(exerciseName: "Lunge", sets: 3, reps: 12),
            PlannedExercise(exerciseName: "Romanian Deadlift", sets: 4, reps: 10)
        ]
    )
    
    return NavigationStack {
        WorkoutTemplateDetailView(template: sample)
    }
    .modelContainer(PreviewData.container)
}
