//
//  EditExerciseOrderView.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//
import SwiftUI

struct EditExerciseOrderView: View {
    @Binding var plannedExercises: [PlannedExercise]
    
    var body: some View {
        List {
            ForEach($plannedExercises, id: \.id) { $exercise in
                HStack {
                    Text(exercise.exerciseName)
                    Spacer()
                    Image(systemName: "line.3.horizontal")
                        .foregroundColor(.gray)
                }
            }
            .onMove { from, to in
                plannedExercises.move(fromOffsets: from, toOffset: to)
            }
            .onDelete { indexSet in
                plannedExercises.remove(atOffsets: indexSet)
            }
        }
    }
}

#Preview {
    struct Wrapper: View {
        @State var plannedExercises = [
            PlannedExercise(
                exerciseName: "Squat",
                sets: [
                    PlannedSet(reps: 8, weight: 60, restSeconds: 90),
                    PlannedSet(reps: 6, weight: 80, restSeconds: 120)
                ]
            ),
            PlannedExercise(
                exerciseName: "Lunge",
                sets: [
                    PlannedSet(reps: 12, weight: 20, restSeconds: 60)
                ]
            )
        ]

        var body: some View {
            NavigationStack {
                EditExerciseOrderView(plannedExercises: $plannedExercises)
            }
        }
    }

    return Wrapper()
}
