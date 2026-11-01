class ConfigError(Exception):
    """Missing or invalid job configuration."""


class FeedError(Exception):
    """A public feed could not be read or parsed."""


class LLMError(Exception):
    """The model response could not be used."""
