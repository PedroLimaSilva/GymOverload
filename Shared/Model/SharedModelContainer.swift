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
            WorkoutTemplate.self
        ])
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("Failed to create ModelContainer: \(error)")
        }
    }()
}
