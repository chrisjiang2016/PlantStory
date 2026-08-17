class ReminderPlantSummary {
  const ReminderPlantSummary({required this.id, required this.nickname, this.speciesName});

  final String id;
  final String nickname;
  final String? speciesName;

  factory ReminderPlantSummary.fromJson(Map<String, dynamic> json) {
    return ReminderPlantSummary(
      id: json['id'].toString(),
      nickname: json['nickname'] as String? ?? '未命名植物',
      speciesName: json['speciesName'] as String?,
    );
  }
}

class ReminderItem {
  const ReminderItem({
    required this.id,
    required this.title,
    required this.remindAt,
    this.careType,
    this.repeatRule,
    this.myPlant,
  });

  final String id;
  final String title;
  final DateTime remindAt;
  final String? careType;
  final String? repeatRule;
  final ReminderPlantSummary? myPlant;

  factory ReminderItem.fromJson(Map<String, dynamic> json) {
    final plantJson = json['myPlant'];
    return ReminderItem(
      id: json['id'].toString(),
      title: json['title'] as String,
      remindAt: DateTime.parse(json['remindAt'] as String),
      careType: json['careType'] as String?,
      repeatRule: json['repeatRule'] as String?,
      myPlant: plantJson is Map<String, dynamic> ? ReminderPlantSummary.fromJson(plantJson) : null,
    );
  }
}
