//
//  Item.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
