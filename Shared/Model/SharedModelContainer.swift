//
//  SharedModelContainer.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 21/06/2025.
//


import SwiftData

enum SharedModelContainer {
    static var container: ModelContainer = {
        let schema = Schema([
            Exercise.self,
            WorkoutTemplate.self,
        ])
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            let container = try ModelContainer(for: schema, configurations: [configuration])
            let context = container.mainContext

            // Only insert exercises if none exist
            let existingExercises = try context.fetch(FetchDescriptor<Exercise>())
            if existingExercises.isEmpty {
                let exercises = ModelDataLoader.loadExercises()
                for exercise in exercises {
                    context.insert(exercise)
                }
            }

            // Only insert templates if none exist
            let existingTemplates = try context.fetch(FetchDescriptor<WorkoutTemplate>())
            if existingTemplates.isEmpty {
                let templates = ModelDataLoader.loadWorkoutTemplates()
                for template in templates {
                    context.insert(template)
                }
            }

            return container
        } catch {
            fatalError("Failed to create ModelContainer: \(error)")
        }
    }()
}
