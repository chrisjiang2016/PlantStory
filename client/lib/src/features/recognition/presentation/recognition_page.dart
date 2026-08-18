import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/demo/demo_mode_controller.dart';
import '../../garden/data/demo_garden_controller.dart';
import '../../garden/data/garden_repository.dart';
import '../data/demo_recognition.dart';
import '../data/recognition_models.dart';
import '../data/recognition_repository.dart';

class RecognitionPage extends ConsumerStatefulWidget {
  const RecognitionPage({super.key, this.initialResult});

  final RecognitionResult? initialResult;

  @override
  ConsumerState<RecognitionPage> createState() => _RecognitionPageState();
}

class _RecognitionPageState extends ConsumerState<RecognitionPage> {
  final ImagePicker _picker = ImagePicker();
  bool _isIdentifying = false;
  bool _isAddingToGarden = false;
  Uint8List? _previewBytes;
  RecognitionResult? _result;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _result = widget.initialResult;
  }

  Future<void> _runDemoIdentification() async {
    setState(() {
      _isIdentifying = true;
      _errorMessage = null;
      _result = null;
    });
    await Future<void>.delayed(const Duration(milliseconds: 550));
    if (!mounted) return;
    setState(() {
      _result = demoRecognitionResult;
      _isIdentifying = false;
    });
  }

  Future<void> _pickAndIdentify(ImageSource source) async {
    setState(() {
      _isIdentifying = true;
      _errorMessage = null;
      _result = null;
    });

    try {
      final file = await _picker.pickImage(
        source: source,
        maxWidth: 1600,
        imageQuality: 88,
      );
      if (file == null) {
        setState(() => _isIdentifying = false);
        return;
      }

      final bytes = await file.readAsBytes();
      final result = await ref
          .read(recognitionRepositoryProvider)
          .identifyPlant(base64Encode(bytes));
      if (!mounted) return;
      setState(() {
        _previewBytes = bytes;
        _result = result;
        _isIdentifying = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.toString();
        _isIdentifying = false;
      });
    }
  }

  Future<void> _showAddToGardenDialog() async {
    final species = _result?.species;
    if (species == null || _isAddingToGarden) return;

    final details = await showDialog<_GardenDetails>(
      context: context,
      builder: (_) => _AddToGardenDialog(speciesName: species.name),
    );

    if (details == null || !mounted) return;

    setState(() {
      _isAddingToGarden = true;
      _errorMessage = null;
    });
    try {
      if (ref.read(demoModeProvider)) {
        await ref
            .read(demoGardenProvider.notifier)
            .addPlant(
              name: species.name,
              nickname: details.nickname,
              location: details.location,
            );
      } else {
        await ref
            .read(gardenRepositoryProvider)
            .addPlant(
              speciesId: int.parse(species.id),
              nickname: details.nickname,
              location: details.location,
            );
        ref.invalidate(gardenPlantsProvider);
      }
      if (!mounted) return;
      setState(() => _isAddingToGarden = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('${species.name} 已加入我的花园')));
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isAddingToGarden = false;
        _errorMessage = error.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFE8F5E9), Color(0xFFF7FBF4), Color(0xFFFFFBF0)],
          ),
        ),
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
            children: [
              const _RecognitionHeader(),
              const SizedBox(height: 18),
              _UploadCard(
                isIdentifying: _isIdentifying,
                previewBytes: _previewBytes,
                onPickGallery: ref.watch(demoModeProvider)
                    ? _runDemoIdentification
                    : () => _pickAndIdentify(ImageSource.gallery),
                onPickCamera: ref.watch(demoModeProvider)
                    ? _runDemoIdentification
                    : () => _pickAndIdentify(ImageSource.camera),
                isDemoMode: ref.watch(demoModeProvider),
              ),
              if (_errorMessage != null) ...[
                const SizedBox(height: 14),
                _ErrorCard(message: _errorMessage!),
              ],
              if (_result != null) ...[
                const SizedBox(height: 14),
                _ResultCard(
                  result: _result!,
                  isAddingToGarden: _isAddingToGarden,
                  onAddToGarden: _showAddToGardenDialog,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _GardenDetails {
  const _GardenDetails({required this.nickname, required this.location});

  final String nickname;
  final String location;
}

class _AddToGardenDialog extends StatefulWidget {
  const _AddToGardenDialog({required this.speciesName});

  final String speciesName;

  @override
  State<_AddToGardenDialog> createState() => _AddToGardenDialogState();
}

class _AddToGardenDialogState extends State<_AddToGardenDialog> {
  late final TextEditingController _nicknameController;
  final _locationController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    _nicknameController = TextEditingController(text: widget.speciesName);
  }

  @override
  void dispose() {
    _nicknameController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('把 ${widget.speciesName} 加入花园'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: _nicknameController,
              decoration: const InputDecoration(labelText: '植物昵称'),
              validator: (value) =>
                  value == null || value.trim().isEmpty ? '请输入植物昵称' : null,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _locationController,
              decoration: const InputDecoration(labelText: '摆放位置（可选）'),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('取消'),
        ),
        FilledButton(
          onPressed: () {
            if (_formKey.currentState?.validate() == true) {
              Navigator.of(context).pop(
                _GardenDetails(
                  nickname: _nicknameController.text.trim(),
                  location: _locationController.text.trim(),
                ),
              );
            }
          },
          child: const Text('加入花园'),
        ),
      ],
    );
  }
}

class _RecognitionHeader extends StatelessWidget {
  const _RecognitionHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '植物识别',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w900,
            color: const Color(0xFF1B5E20),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          '拍照或从相册选择植物图片，识别后可查看置信度和养护信息。',
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(color: Colors.black54),
        ),
      ],
    );
  }
}

class _UploadCard extends StatelessWidget {
  const _UploadCard({
    required this.isIdentifying,
    required this.previewBytes,
    required this.onPickGallery,
    required this.onPickCamera,
    required this.isDemoMode,
  });

  final bool isIdentifying;
  final Uint8List? previewBytes;
  final VoidCallback onPickGallery;
  final VoidCallback onPickCamera;
  final bool isDemoMode;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2E7D32).withValues(alpha: 0.10),
            blurRadius: 26,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AspectRatio(
            aspectRatio: 16 / 10,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: previewBytes == null
                  ? Container(
                      color: const Color(0xFFF1F8E9),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.add_photo_alternate_outlined,
                            color: Color(0xFF43A047),
                            size: 56,
                          ),
                          SizedBox(height: 12),
                          Text(isDemoMode ? '点击按钮体验本地示例识别' : '选择一张植物图片开始识别'),
                        ],
                      ),
                    )
                  : Image.memory(previewBytes!, fit: BoxFit.cover),
            ),
          ),
          const SizedBox(height: 18),
          if (isIdentifying)
            const Center(
              child: Column(
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 10),
                  Text('正在识别植物...'),
                ],
              ),
            )
          else
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                FilledButton.icon(
                  onPressed: onPickGallery,
                  icon: const Icon(Icons.photo_library_outlined),
                  label: Text(isDemoMode ? '体验示例识别' : '从相册选择'),
                ),
                OutlinedButton.icon(
                  onPressed: onPickCamera,
                  icon: const Icon(Icons.photo_camera_outlined),
                  label: Text(isDemoMode ? '再次识别' : '拍照识别'),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({
    required this.result,
    required this.isAddingToGarden,
    required this.onAddToGarden,
  });

  final RecognitionResult result;
  final bool isAddingToGarden;
  final VoidCallback onAddToGarden;

  @override
  Widget build(BuildContext context) {
    final species = result.species;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.96),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2E7D32).withValues(alpha: 0.10),
            blurRadius: 26,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F5E9),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(
                  Icons.eco,
                  color: Color(0xFF43A047),
                  size: 34,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      result.displayName,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF1B5E20),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '置信度 ${result.recognition.confidence}%',
                      style: Theme.of(
                        context,
                      ).textTheme.bodyMedium?.copyWith(color: Colors.black54),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (species?.scientificName?.isNotEmpty == true)
                _MetaChip(
                  icon: Icons.science_outlined,
                  label: species!.scientificName!,
                ),
              if (species?.watering?.isNotEmpty == true)
                _MetaChip(
                  icon: Icons.water_drop_outlined,
                  label: species!.watering!,
                ),
              if (species?.sunlight?.isNotEmpty == true)
                _MetaChip(
                  icon: Icons.wb_sunny_outlined,
                  label: species!.sunlight!,
                ),
            ],
          ),
          if (result.description?.isNotEmpty == true) ...[
            const SizedBox(height: 16),
            Text(
              result.description!,
              maxLines: 5,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                height: 1.55,
                color: Colors.black87,
              ),
            ),
          ],
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: species == null || isAddingToGarden
                ? null
                : onAddToGarden,
            icon: isAddingToGarden
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.add_circle_outline),
            label: Text(isAddingToGarden ? '正在加入...' : '添加到我的花园'),
          ),
        ],
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F8E9),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: const Color(0xFF43A047)),
          const SizedBox(width: 4),
          Text(
            label,
            style: Theme.of(
              context,
            ).textTheme.labelSmall?.copyWith(color: const Color(0xFF2E7D32)),
          ),
        ],
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        message,
        style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer),
      ),
    );
  }
}
