/// Residence types stored in API `property_type` column.
abstract final class PropertyTypes {
  static const apartment = 'apartment';
  static const villa = 'villa';
  static const studio = 'studio';
  static const hotel = 'hotel';
  static const house = 'house';
  static const residence = 'residence';

  static const all = [apartment, villa, studio, hotel];

  static String canonical(String value) {
    if (value == house) return villa;
    if (value == residence) return apartment;
    return value;
  }
}
