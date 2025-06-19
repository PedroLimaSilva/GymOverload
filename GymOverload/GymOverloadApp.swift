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
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            let container = try ModelContainer(for: schema, configurations: [modelConfiguration])
            let context = container.mainContext
            
            // ⬇️ Seed Exercises if database is empty
            let hasExercises = try context.fetchCount(FetchDescriptor<Exercise>()) > 0
            if !hasExercises {
                let dtos: [ExerciseDTO] = ModelDataLoader.loadDTOs(from: "exercises")
                dtos.map { $0.toModel() }.forEach { context.insert($0) }
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
