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
            ForEach(Array(zip(plannedExercise.sets.indices, $plannedExercise.sets)), id: \.1.id) { index, $set in
                SetRow(index: index, set: $set)
            }
            .onDelete { offsets in
                plannedExercise.sets.remove(atOffsets: offsets)
            }

            HStack {
                Spacer()
                Button {
                    plannedExercise.sets.append(
                        PlannedSet(reps: 10, weight: 0, restSeconds: 60)
                    )
                } label: {
                    Label("Add Set", systemImage: "plus")
                        .foregroundColor(.green)
                        .padding(.vertical, 6)
                }
                Spacer()
            }
        } header: {
            Text(plannedExercise.name)
                .font(.headline)
        }
        .listRowInsets(EdgeInsets())
        .listRowBackground(Color.clear)
    }
}

struct SetRow: View {
    let index: Int
    @Binding var set: PlannedSet

    var body: some View {
        HStack {
            Text("\(index + 1)")
                .fontWeight(.bold)
                .foregroundColor(.accentColor)

            TextField("kg", value: $set.weight, format: .number)
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.center)
                .frame(width: 60)
            Text("kg").foregroundColor(.secondary)

            TextField("reps", value: $set.reps, format: .number)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .frame(width: 50)
            Text("reps").foregroundColor(.secondary)
            Spacer()
        }
        .font(.system(.body, design: .monospaced))
        .padding(.horizontal)
        .padding(.vertical, 6)
    }
}

#Preview {
    struct Wrapper: View {
        @State var plannedExercise = PlannedExercise(
            name: "Squat",
            sets: [
                PlannedSet(reps: 10, weight: 60, restSeconds: 60),
                PlannedSet(reps: 8, weight: 80, restSeconds: 90)
            ]
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
