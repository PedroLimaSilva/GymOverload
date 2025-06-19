//
//  Item.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//

import Foundation
import SwiftData

@Model
final class WorkoutSet {
    var exerciseName: String
    var weight: Double
    var reps: Int
    var restTime: TimeInterval // in seconds
    var timestamp: Date

    init(exerciseName: String, weight: Double, reps: Int, restTime: TimeInterval, timestamp: Date = .now) {
        self.exerciseName = exerciseName
        self.weight = weight
        self.reps = reps
        self.restTime = restTime
        self.timestamp = timestamp
    }
}
