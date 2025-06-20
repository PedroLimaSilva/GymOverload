//
//  PreviewData.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//

import SwiftData

@MainActor
enum PreviewData {
    static let container: ModelContainer = {
        let schema = Schema([Exercise.self, WorkoutTemplate.self])
        let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
        let container = try! ModelContainer(for: schema, configurations: [config])
        let context = container.mainContext

        // Insert some base exercises
        let exercises = ModelDataLoader.loadExercises()
        for exercise in exercises {
            context.insert(exercise)
        }

        // Insert a preview workout template
        let template = WorkoutTemplate(
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
        context.insert(template)

        return container
    }()
}
