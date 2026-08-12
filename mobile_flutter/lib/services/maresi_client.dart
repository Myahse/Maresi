import 'package:maresi_mobile/config/app_config.dart';
import 'package:maresi_mobile/mock/mock_api_service.dart';
import 'package:maresi_mobile/services/api_service.dart';
import 'package:maresi_mobile/services/maresi_api.dart';

MaresiApi get maresiApi =>
    AppConfig.useMockData ? MockApiService.instance : ApiService.instance;
