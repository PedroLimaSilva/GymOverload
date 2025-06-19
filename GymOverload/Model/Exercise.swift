//
//  Exercise.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//
import Foundation
import SwiftData

enum ExerciseCategory: String, CaseIterable, Codable, Hashable {
    case abs = "Abs"
    case back = "Back"
    case biceps = "Biceps"
    case cardio = "Cardio"
    case chest = "Chest"
    case legs = "Legs"
    case shoulders = "Shoulders"
    case triceps = "Triceps"
}

@Model
final class Exercise {
    var name: String
    var categoryRawValues: [String]
    var defaultRestSeconds: Int // in seconds
    var weightIncrementKg: Double
    var weightIncrementLb: Double
    var weightUnit: String // "kg" or "lb"
    var kind: String // e.g. "Weight, Reps"
    var doubleWeightForVolume: Bool
    var notes: String?
    var createdAt: Date // ← Add this line
    
    var categories: [ExerciseCategory] {
        get {
            categoryRawValues.compactMap { ExerciseCategory(rawValue: $0) }
        }
        set {
            categoryRawValues = newValue.map { $0.rawValue }
        }
    }
    
    init(
        name: String,
        categories: [ExerciseCategory],
        defaultRestSeconds: Int,
        weightIncrementKg: Double,
        weightIncrementLb: Double,
        weightUnit: String,
        kind: String,
        doubleWeightForVolume: Bool,
        notes: String? = nil,
        createdAt: Date = Date() // ← Default to now
    ) {
        self.name = name
        self.categoryRawValues = categories.map { $0.rawValue }
        self.defaultRestSeconds = defaultRestSeconds
        self.weightIncrementKg = weightIncrementKg
        self.weightIncrementLb = weightIncrementLb
        self.weightUnit = weightUnit
        self.kind = kind
        self.doubleWeightForVolume = doubleWeightForVolume
        self.notes = notes
        self.createdAt = createdAt
    }
}

struct ExerciseDTO: Decodable {
    let name: String
    let categories: [ExerciseCategory]
    let defaultRestSeconds: Int
    let weightIncrementKg: Double
    let weightIncrementLb: Double
    let weightUnit: String
    let kind: String
    let doubleWeightForVolume: Bool
    let notes: String?

    func toModel() -> Exercise {
        Exercise(
            name: name,
            categories: categories,
            defaultRestSeconds: defaultRestSeconds,
            weightIncrementKg: weightIncrementKg,
            weightIncrementLb: weightIncrementLb,
            weightUnit: weightUnit,
            kind: kind,
            doubleWeightForVolume: doubleWeightForVolume,
            notes: notes
        )
    }
}
