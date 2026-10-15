import type {
  StyleProp,
  TextInputProps,
  TextStyle,
  ViewStyle,
} from 'react-native';
export interface IAnimatedInput extends Omit<TextInputProps, 'placeholder'> {
  placeholders: string[];
  active?: boolean;
  animationInterval?: number;
  containerStyle?: StyleProp<ViewStyle>;
  inputWrapperStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  placeholderStyle?: StyleProp<TextStyle>;
  placeholderContainerStyle?: StyleProp<ViewStyle>;
  characterEnterDuration?: number;
  characterExitDuration?: number;
  characterDelayIncrement?: number;
}
export interface ICharacter {
  char: string;
  index: number;
  enterDuration: number;
  exitDuration: number;
  delayIncrement: number;
  style?: StyleProp<TextStyle>;
}
