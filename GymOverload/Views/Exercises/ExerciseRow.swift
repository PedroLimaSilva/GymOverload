//
//  ExerciseRow.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//
import SwiftUI

struct ExerciseRow: View {
    let exercise: Exercise

    var body: some View {
        VStack(alignment: .leading) {
            Text(exercise.name)
                .font(.headline)
                .foregroundColor(.primary)
            Text(exercise.categories.map(\.rawValue).joined(separator: ", "))
                .font(.subheadline)
                .foregroundColor(.secondary)
        }.transition(.move(edge: .leading).combined(with: .opacity))
    }
}
