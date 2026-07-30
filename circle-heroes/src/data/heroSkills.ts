import { registerTemplateSkill } from "../systems/skillTemplates";

/*
 * 66+5 로스터 액티브 스킬 일괄 등록.
 * 각 영웅 id → 재사용 스킬 템플릿(skillTemplates.ts) 매핑.
 * 이 파일을 import하는 순간(side effect) battle.ts의 ACTIVES가 채워진다.
 */
registerTemplateSkill("snowwhite_light_001", "revive_ally", "UR");
registerTemplateSkill("guan_yu_001", "execute", "SSR");
registerTemplateSkill("zhuge_liang_wind_001", "buff_spd_team", "SSR");
registerTemplateSkill("zeus_light_001", "aoe_strike", "SSR");
registerTemplateSkill("liu_bei_light_001", "buff_atk_team", "SR");
registerTemplateSkill("cao_cao_dark_001", "debuff_atk_enemy", "SR");
registerTemplateSkill("zhao_yun_wind_001", "aoe_strike", "SR");
registerTemplateSkill("lu_bu_flame_001", "execute", "SR");
registerTemplateSkill("pang_tong_dark_001", "debuff_atk_enemy", "SR");
registerTemplateSkill("sun_wukong_flame_001", "aoe_strike", "SR");
registerTemplateSkill("medusa_dark_001", "stun_target", "SSR");
registerTemplateSkill("arachne_dark_001", "stun_target", "SSR");
registerTemplateSkill("poseidon_water_001", "aoe_strike", "SR");
registerTemplateSkill("hades_dark_001", "execute", "SR");
registerTemplateSkill("hercules_flame_001", "aoe_strike", "SR");
registerTemplateSkill("michael_light_001", "shield_team", "UR");
registerTemplateSkill("death_knight_001", "lifesteal_strike", "SSR");
registerTemplateSkill("puss_boots_wind_001", "debuff_atk_enemy", "SSR");
registerTemplateSkill("belle_light_001", "buff_atk_team", "SSR");
registerTemplateSkill("zhang_fei_flame_001", "single_burst", "SR");
registerTemplateSkill("diaochan_dark_001", "debuff_atk_enemy", "SSR");
registerTemplateSkill("huang_zhong_wind_001", "execute", "SR");
registerTemplateSkill("dian_wei_flame_001", "taunt_self", "SR");
registerTemplateSkill("zhang_liao_water_001", "aoe_strike", "SR");
registerTemplateSkill("hua_tuo_light_001", "heal_all", "SR");
registerTemplateSkill("da_qiao_wind_001", "shield_team", "SR");
registerTemplateSkill("guo_jia_water_001", "debuff_atk_enemy", "SR");
registerTemplateSkill("cerberus_dark_001", "shield_ally", "SSR");
registerTemplateSkill("siren_water_001", "debuff_atk_enemy", "SR");
registerTemplateSkill("athena_light_001", "buff_spd_team", "SSR");
registerTemplateSkill("artemis_wind_001", "execute", "SR");
registerTemplateSkill("persephone_dark_001", "heal_all", "SSR");
registerTemplateSkill("sphinx_flame_001", "buff_atk_team", "SR");
registerTemplateSkill("ares_flame_001", "single_burst", "SR");
registerTemplateSkill("succubus_dark_001", "debuff_atk_enemy", "UR");
registerTemplateSkill("balrog_flame_001", "aoe_strike", "SSR");
registerTemplateSkill("raphael_light_001", "heal_all", "SSR");
registerTemplateSkill("uriel_light_001", "execute", "SSR");
registerTemplateSkill("gumiho_flame_001", "lifesteal_strike", "UR");
registerTemplateSkill("baekho_water_001", "taunt_self", "UR");
registerTemplateSkill("hong_gildong_wind_001", "execute", "SR");
registerTemplateSkill("beast_dark_001", "taunt_self", "SSR");
registerTemplateSkill("ma_chao_wind_001", "single_burst", "UR");
registerTemplateSkill("xu_chu_flame_001", "single_burst", "SR");
registerTemplateSkill("xiahou_dun_flame_001", "single_burst", "SR");
registerTemplateSkill("xiao_qiao_water_001", "buff_atk_team", "SSR");
registerTemplateSkill("minotaur_flame_001", "taunt_self", "SR");
registerTemplateSkill("harpy_wind_001", "single_burst", "SR");
registerTemplateSkill("incubus_dark_001", "single_burst", "SSR");
registerTemplateSkill("pinocchio_wind_001", "single_burst", "SSR");
registerTemplateSkill("zhu_bajie_water_001", "shield_ally", "SSR");
registerTemplateSkill("soldier_flame_001", "taunt_self", "N");
registerTemplateSkill("soldier_water_001", "taunt_self", "N");
registerTemplateSkill("soldier_wind_001", "taunt_self", "N");
registerTemplateSkill("soldier_light_001", "taunt_self", "N");
registerTemplateSkill("soldier_dark_001", "taunt_self", "N");
registerTemplateSkill("knight_flame_001", "single_burst", "N");
registerTemplateSkill("knight_water_001", "single_burst", "N");
registerTemplateSkill("knight_wind_001", "single_burst", "N");
registerTemplateSkill("knight_light_001", "single_burst", "N");
registerTemplateSkill("knight_dark_001", "single_burst", "N");
registerTemplateSkill("mage_flame_001", "single_burst", "R");
registerTemplateSkill("mage_water_001", "single_burst", "R");
registerTemplateSkill("mage_wind_001", "single_burst", "R");
registerTemplateSkill("mage_light_001", "single_burst", "R");
registerTemplateSkill("mage_dark_001", "single_burst", "R");

// 히든(무진영, Unknown=최상위 등급) 5종 — 시크릿 코드로만 획득
registerTemplateSkill("unknown_hidden_001", "single_burst", "Unknown"); // 수바크
registerTemplateSkill("unknown_hidden_002", "heal_all", "Unknown"); // 장관님
registerTemplateSkill("unknown_hidden_003", "aoe_strike", "Unknown"); // 소대장님
registerTemplateSkill("unknown_hidden_004", "shield_team", "Unknown"); // 벙커
registerTemplateSkill("unknown_hidden_005", "execute", "Unknown"); // 지영문희
