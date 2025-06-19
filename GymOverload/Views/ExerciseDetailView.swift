//
//  ExerciseDetailView.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//

import SwiftUI
import SwiftData

struct ExerciseDetailView: View {
    @Bindable var exercise: Exercise
    @State private var isCategoryPickerPresented = false
    
    var body: some View {
        Form {
            Section(header: Text("Name")) {
                TextField("Name", text: $exercise.name)
            }

            Button {
                isCategoryPickerPresented = true
            } label: {
                HStack {
                    Text("Categories")
                    Spacer()
                    Text(exercise.categories.map(\.rawValue).joined(separator: ", "))
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.trailing)
                }
            }

            Section(header: Text("Defaults")) {
                HStack {
                    Text("Rest Time (seconds)")
                    Spacer()
                    TextField("seconds", value: $exercise.defaultRestSeconds, format: .number)
                        .multilineTextAlignment(.trailing)
                        .keyboardType(.numberPad)
                }
                
                Picker("Weight Unit", selection: $exercise.weightUnit) {
                    Text("kg").tag("kg")
                    Text("lb").tag("lb")
                }

                HStack {
                    Text("Increment (kg)")
                    Spacer()
                    TextField("kg", value: $exercise.weightIncrementKg, format: .number)
                        .multilineTextAlignment(.trailing)
                        .keyboardType(.decimalPad)
                }

                HStack {
                    Text("Increment (lb)")
                    Spacer()
                    TextField("lb", value: $exercise.weightIncrementLb, format: .number)
                        .multilineTextAlignment(.trailing)
                        .keyboardType(.decimalPad)
                }
            }

            Section(header: Text("Kind")) {
                TextField("Kind", text: $exercise.kind)
            }

            Toggle("Double Weight For Volume", isOn: $exercise.doubleWeightForVolume)

            Section(header: Text("Notes")) {
                TextEditor(text: Binding(
                    get: { exercise.notes ?? "" },
                    set: { exercise.notes = $0 }
                ))
                .frame(minHeight: 100)
            }
        }
        .sheet(isPresented: $isCategoryPickerPresented) {
            MultiCategoryPicker(selectedCategories: Binding(
                get: { exercise.categories },
                set: { exercise.categories = $0 }
            ))
        }
        .navigationTitle(exercise.name)
    }
}

#Preview {
    let context = PreviewData.container.mainContext
    let exercise = try! context.fetch(FetchDescriptor<Exercise>()).first!

    return ExerciseDetailView(exercise: exercise)
        .modelContainer(PreviewData.container)
}
