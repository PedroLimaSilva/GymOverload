//
//  PlannedExerciseSection.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//

import SwiftUI

struct PlannedExerciseSection: View {
    @Binding var plannedExercise: PlannedExercise

    var body: some View {
        Section {
            HStack {
                Text("Target Reps")
                Spacer()
                Stepper(value: $plannedExercise.targetReps, in: 1...30) {
                    Text("\(plannedExercise.targetReps)")
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }
            }

            HStack {
                Text("Number of Sets")
                Spacer()
                Stepper(value: $plannedExercise.sets, in: 1...10) {
                    Text("\(plannedExercise.sets)")
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }
            }
        } header: {
            Text(plannedExercise.name)
                .font(.headline)
        }
        .listRowInsets(EdgeInsets())
        .listRowBackground(Color.clear)
    }
}

#Preview {
    struct Wrapper: View {
        @State var plannedExercise = PlannedExercise(
            name: "Squat",
            sets: 4,
            targetReps: 8
        )

        var body: some View {
            NavigationStack {
                List {
                    PlannedExerciseSection(plannedExercise: $plannedExercise)
                }
            }
        }
    }

    return Wrapper()
}
