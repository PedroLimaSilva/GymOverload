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
        Section(header: Text(plannedExercise.exerciseName)) {
            ForEach(Array($plannedExercise.sets.enumerated()), id: \.element.id) { index, $set in
                HStack {
                    Text("\(index + 1)")
                        .fontWeight(.bold)
                        .foregroundColor(.accentColor)
                        .frame(width: 20, alignment: .leading)

                    // Editable weight
                    TextField("kg", value: $set.weight, format: .number)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.center)
                        .font(.system(.body, design: .monospaced).bold())
                        .frame(width: 60)

                    Text("kg")
                        .foregroundColor(.secondary)

                    // Editable reps
                    TextField("reps", value: $set.reps, format: .number)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.center)
                        .font(.system(.body, design: .monospaced).bold())
                        .frame(width: 50)

                    Text("reps")
                        .foregroundColor(.secondary)

                    Spacer()

                    /*
                    TextField("rest", value: $set.restSeconds, format: .number)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.center)
                        .font(.system(.body, design: .monospaced).bold())
                        .frame(width: 50)
                    
                    Text("rest")
                        .foregroundColor(.secondary)
                     */
                }
            }
            .onDelete { offsets in
                plannedExercise.sets.remove(atOffsets: offsets)
            }

            Button {
                plannedExercise.sets.append(
                    PlannedSet(reps: 10, weight: 0, restSeconds: 60)
                )
            } label: {
                Label("Add Set", systemImage: "plus")
            }
        }
    }
}

#Preview {
    struct Wrapper: View {
        @State var plannedExercise = PlannedExercise(
            exerciseName: "Squat",
            sets: [
                PlannedSet(reps: 10, weight: 60, restSeconds: 60),
                PlannedSet(reps: 8, weight: 80, restSeconds: 90)
            ]
        )

        var body: some View {
            NavigationStack {
                Form {
                    PlannedExerciseSection(plannedExercise: $plannedExercise)
                }
            }
        }
    }

    return Wrapper()
}
