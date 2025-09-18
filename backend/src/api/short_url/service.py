from .config import APIInfo
from ..utils import parse_url,md5_data


class ShortUrlService(object):
    def __init__(self):
        self.api_info = APIInfo

    def get_short_url(self, url: str) -> str:
        url_path,query_params = parse_url(url)
        data = query_params.get("data")
        print(data)
        return url_path,query_params


if __name__ == "__main__":
    service = ShortUrlService()
    print(service.get_short_url(APIInfo.url))