/// Residence types stored in API `property_type` column.
abstract final class PropertyTypes {
  static const house = 'house';
  static const apartment = 'apartment';
  static const studio = 'studio';
  static const residence = 'residence';

  static const all = [apartment, studio, house, residence];
}
