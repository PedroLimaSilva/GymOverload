//
//  GymOverloadApp.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//

import SwiftUI
import SwiftData

@main
struct GymOverloadApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            Exercise.self,
            WorkoutTemplate.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            let container = try ModelContainer(for: schema, configurations: [modelConfiguration])
            let context = container.mainContext

            // Insert some base exercises if needed
            let exercises = ModelDataLoader.loadExercises()
            for exercise in exercises {
                context.insert(exercise)
            }

            // Create and insert a template with inline embedded data
            let existingTemplates = try context.fetch(FetchDescriptor<WorkoutTemplate>())
            if existingTemplates.isEmpty {
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
            }

            return container
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(sharedModelContainer)
    }
}
