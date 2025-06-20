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
    @State private var editMode: EditMode = .inactive

    var body: some View {
        Group {
            content
                .navigationTitle(template.name)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        EditButton()
                    }
                }
                .environment(\.editMode, $editMode)
                .sheet(isPresented: $isPickingExercise) {
                    ExerciseListView(onSelectMultiple: { selected in
                        for exercise in selected {
                            template.plannedExercises.append(
                                PlannedExercise(exerciseName: exercise.name, sets: [])
                            )
                        }
                        isPickingExercise = false
                    })
                }
        }
    }

    @ViewBuilder
    private var content: some View {
        if editMode.isEditing {
            List {
                Section(header: Text("Template Name")) {
                    TextField("Name", text: $template.name)
                }

                Section(header: Text("Exercises")) {
                    ForEach(template.plannedExercises.indices, id: \.self) { index in
                        Text(template.plannedExercises[index].exerciseName)
                    }
                    .onMove { from, to in
                        template.plannedExercises.move(fromOffsets: from, toOffset: to)
                    }
                    .onDelete { offsets in
                        template.plannedExercises.remove(atOffsets: offsets)
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
        } else {
            Form {
                Section(header: Text("Template Name")) {
                    TextField("Name", text: $template.name)
                }

                Group {
                    if template.plannedExercises.isEmpty {
                        Text("No exercises added yet")
                            .foregroundColor(.secondary)
                    } else {
                        ForEach(template.plannedExercises.indices, id: \.self) { index in
                            PlannedExerciseSection(plannedExercise: $template.plannedExercises[index])
                        }
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

