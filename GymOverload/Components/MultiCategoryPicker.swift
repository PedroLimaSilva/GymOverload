//
//  MultiCategoryPicker.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//


import SwiftUI

struct MultiCategoryPicker: View {
    let title: String
    let showClear: Bool
    @Binding var selectedCategories: [ExerciseCategory]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(ExerciseCategory.allCases, id: \.self) { category in
                    Toggle(category.rawValue, isOn: Binding(
                        get: { selectedCategories.contains(category) },
                        set: { isSelected in
                            if isSelected {
                                selectedCategories.append(category)
                            } else {
                                selectedCategories.removeAll { $0 == category }
                            }
                        }
                    ))
                }
            }
            .navigationTitle(title)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        dismiss()
                    } label: {
                        Label("Done", systemImage: "checkmark")
                    }
                }
                if showClear {
                    ToolbarItem(placement: .cancellationAction) {
                        Button {
                            selectedCategories.removeAll()
                            dismiss()
                        } label: {
                            Label("Clear", systemImage: "xmark")
                        }
                    }
                }
            }
        }
    }
}

#Preview{
    var selectedCategories: [ExerciseCategory] = []
    return MultiCategoryPicker(title: "Title", showClear: true, selectedCategories: Binding(
        get: { selectedCategories },
        set: { selectedCategories = $0 }
    ))
}
