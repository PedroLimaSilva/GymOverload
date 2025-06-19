//
//  ModelDataLoader.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//


import Foundation

/// A generic loader for decoding DTOs from bundled JSON files.
enum ModelDataLoader {
    static func loadExercises() -> [Exercise] {
        loadDTOs(from: "exercises").map { ($0 as ExerciseDTO).toModel() }
    }
    
    /// Loads and decodes an array of DTOs from a JSON file in the app bundle.
    static func loadDTOs<T: Decodable>(from filename: String) -> [T] {
        guard let url = Bundle.main.url(forResource: filename, withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([T].self, from: data)
        else {
            return []
        }
        return decoded
    }
}
